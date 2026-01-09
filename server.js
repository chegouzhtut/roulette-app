const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Раздача статических файлов из текущей папки
app.use(express.static(__dirname));

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
