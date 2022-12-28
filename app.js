const http = require('http');
const querystring = require('querystring')
const dotenv = require('dotenv');

dotenv.config();

const host = '127.0.0.1';
const port = 7000;

const METHOD_GET = 'GET';
const METHOD_POST = 'POST';

let url500 = "";

function sendText(response, text) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(text);
}

function get(request, response, callback) {
    if (request.method !== METHOD_GET) methodNotAllowed(response);
    else callback();
}

function post(request, response, callback) {
    if (request.method !== METHOD_POST) methodNotAllowed(response);
    else getPostData(request, response, callback);
}

function all(request, response, callback) {
    getPostData(request, response, callback);
}

function getPostData(request, response, callback) {
    let rawData = '';
    let parsedData;

    request.on('data', function (data) {
        rawData += data;
        if (data.length > 1e6) {
            rawData = '';
            response.statusCode = 413;
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.end('Payload too large');
            request.connection.destroy();
        }
    });

    request.on('end', () => {
        callback(querystring.decode(rawData));
    });
}

function methodNotAllowed(response) {
    response.statusCode = 405;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Method Not Allowed');
}

function redirect(response, url) {
    response.statusCode = 302;
    response.setHeader('Location', url);
    response.end();
}

function set500(url) {
    url500 = url;
}

function notFound(response) {
    response.statusCode = 404;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Страница не найдена');
}

const server = http.createServer((request, response) => {
    if (request.url === url500) {
        response.statusCode = 500;
        response.end('Internal Server Error');
    } else {
        switch (request.url) {
            case '/':
                get(request, response, () => {
                    sendText(response, 'Добро пожаловать!');
                });
                break;
            case '/about':
                get(request, response, () => {
                    sendText(response, 'Страница о нас');
                });
                break;
            case '/send':
                post(request, response, () => {
                    sendText(response, 'POST-запрос обработан');
                });
                break;
            case '/all':
                all(request, response, () => {
                    sendText(response, 'Эта страница обрабатывает GET и POST запросы');
                });
                break;
            case '/env':
                get(request, response, () => {
                    sendText(response, `NODE_ENV=${process.env.NODE_ENV}`);
                });
                break;
            case '/set-header':
                post(request, response, (postData) => {
                    let headerName = postData.name;
                    let headerValue = postData.value;
                    response.setHeader(headerName, headerValue);
                    sendText(response, `Заголовок установлен (${headerName}=${headerValue})`);
                });
                break;
            case '/set-cookie':
                post(request, response, (postData) => {
                    let cookieName = postData.name;
                    let cookieValue = postData.value;
                    response.setHeader('Set-Cookie', `${cookieName}=${cookieValue}`);
                    sendText(response, `Куки установлена (${cookieName}=${cookieValue})`);
                });
                break;
            case '/get-cookies':
                get(request, response, () => {
                    sendText(response, request.headers.cookie);
                });
                break;
            case '/redirect':
                post(request, response, (postData) => {
                    let redirectUrl = postData.redirectUrl;
                    redirect(response, redirectUrl);
                });
                break;
            case '/set-500':
                post(request, response, (postData) => {
                    url500 = postData.url;
                    sendText(response, `Теперь ${url500} выдает 500 ошибку`);
                });
                break;
            default:
                notFound(response);
                break;
        }
    }
});

server.listen(port, host, () => {
    console.log(`Сервер запущен на http://${host}:${port}`);
});