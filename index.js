require('dotenv').config()
const express = require('express');
const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');

const app = express();
const proxy = httpProxy.createProxyServer();

const localHost = process.env.LOCAL_HOST || 'localhost'
const localPort = process.env.LOCAL_PORT || 443

const remoteHost = process.env.REMOTE_HOST || 'localhost'
const remoteProtocol = process.env.REMOTE_PROTOCOL || 'https'
const remotePort = process.env.REMOTE_PORT || 443

console.log(remoteHost)

const targetServer = `${remoteProtocol}://${remoteHost}:${remotePort}`;

// Загрузка SSL-сертификата и ключа
const privateKey = fs.readFileSync('cert/key.pem', 'utf8');
const certificate = fs.readFileSync('cert/cert.pem', 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate,
    passphrase: '1234',
};

app.use((req, res) => {
    // Проксирование запросов на целевой сервер
    proxy.web(req, res, {
        target: targetServer,
        headers: {
            Host: remoteHost,
        }
    });
});

// Обработка события ошибки прокси
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
});

// Создание сервера HTTPS
const httpsServer = https.createServer(credentials, app);

// Запуск сервера
httpsServer.listen(localPort, localHost, () => {
    console.log(`Proxy server is running on ${localHost}:${localPort}`);
    console.log(`Forwarding to ${targetServer}`)
});