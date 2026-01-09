const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { initSocketHandler } = require('./src/socketHandler');
const apiRoutes = require('./src/routes');

// Инициализация базы данных
require('./src/database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Настройка сессий
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: './'
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    }
}));

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// API роуты
app.use('/api', apiRoutes);

// Создание HTTP сервера и Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Инициализация обработчика Socket.io
initSocketHandler(io);

// Запуск сервера
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
