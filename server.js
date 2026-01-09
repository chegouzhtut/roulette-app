const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initSocketHandler } = require('./src/socketHandler');

const app = express();
const port = process.env.PORT || 3000;

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Создание HTTP сервера и Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Инициализация обработчика Socket.io
initSocketHandler(io);

// Запуск сервера
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
