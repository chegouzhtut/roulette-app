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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'socketHandler.js:37',message:'spinWheel received',data:{socketId:socket.id,roomId,winner,roomOptions:rooms[roomId]?.options||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            // Отправка события всем в комнате
            io.to(roomId).emit('wheelSpun', winner);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'socketHandler.js:40',message:'wheelSpun emitted to room',data:{roomId,winner,clientsCount:io.sockets.adapter.rooms.get(roomId)?.size||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
        });

        // Отключение
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}

module.exports = { initSocketHandler };
