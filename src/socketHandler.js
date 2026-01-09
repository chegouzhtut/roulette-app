// Обработчик Socket.io для мультиплеерной игры

function initSocketHandler(io) {
    // Хранение данных комнат в памяти
    const rooms = {};

    // Обработка подключений
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Подключение к комнате
        socket.on('joinRoom', (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);

            // Инициализация комнаты, если её нет
            if (!rooms[roomId]) {
                rooms[roomId] = {
                    options: []
                };
            }

            // Отправка текущих вариантов новому участнику
            socket.emit('optionsUpdated', rooms[roomId].options);
        });

        // Обновление вариантов
        socket.on('updateOptions', (roomId, newOptions) => {
            if (rooms[roomId]) {
                rooms[roomId].options = newOptions;
                // Отправка обновления всем в комнате
                io.to(roomId).emit('optionsUpdated', newOptions);
            }
        });

        // Запуск рулетки
        socket.on('spinWheel', (roomId, winner) => {
            // Отправка события всем в комнате
            io.to(roomId).emit('wheelSpun', winner);
        });

        // Отключение
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}

module.exports = { initSocketHandler };
