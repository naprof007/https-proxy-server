require('dotenv').config()
const express = require('express');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');
var cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express();
const proxy = httpProxy.createProxyServer();

const localUseHttps = process.env.LOCAL_USE_HTTPS === 'true'
const localHost = process.env.LOCAL_HOST || 'localhost'
const localPort = process.env.LOCAL_PORT || 443

const remoteUseHttps = process.env.REMOTE_USE_HTTPS === 'true'
const remoteHost = process.env.REMOTE_HOST || 'localhost'
const remotePort = process.env.REMOTE_PORT || 443
const remoteSecurity = process.env.REMOTE_SECURITY === 'true'

const useCors = process.env.USE_CORS === 'true'
const corsOrigin = process.env.CORS_ORIGIN || ''
const corsAllowCredentials = process.env.CORS_ALLOW_CREDENTIALS === 'true'

const localServer = `${localUseHttps ? 'https' : 'http'}://${localHost}:${localPort}`;
const targetServer = `${remoteUseHttps ? 'https' : 'http'}://${remoteHost}:${remotePort}`;

if (useCors) {
    app.use(cors({
        origin: corsOrigin,
        credentials: corsAllowCredentials,
    }))
}

// Загрузка SSL-сертификата и ключа
const privateKey = fs.readFileSync('cert/key.pem', 'utf8');
const certificate = fs.readFileSync('cert/cert.pem', 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate,
    passphrase: '1234',
}

const wsProxy = createProxyMiddleware({
    target: `ws://${remoteHost}:${remotePort}`,
    changeOrigin: true,
    secure: remoteUseHttps,
    ws: true,
})
app.use(wsProxy)

app.use((req, res) => {
    // Проксирование запросов на целевой сервер
    proxy.web(req, res, {
        target: targetServer,
        secure: remoteSecurity,
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

// Создание сервера HTTPS или HTTP
const httpsServer = (localUseHttps ? https : http).createServer(credentials, app);
httpsServer.on("upgrade", wsProxy.upgrade)

// Запуск сервера
httpsServer.listen(localPort, localHost, () => {
    console.log(`Proxy server is running on ${localServer}`);
    console.log(`Forwarding to ${targetServer}`)
});