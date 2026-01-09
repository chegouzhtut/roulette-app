const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database');

const router = express.Router();

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Необходима авторизация' });
    }
}

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Пользователь с таким именем уже существует' });
                    }
                    return res.status(500).json({ error: 'Ошибка при создании пользователя' });
                }

                res.status(201).json({ 
                    message: 'Пользователь успешно зарегистрирован',
                    userId: this.lastID 
                });
            }
        );
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Вход
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        // Поиск пользователя
        db.get(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка при поиске пользователя' });
                }

                if (!user) {
                    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
                }

                // Проверка пароля
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (!passwordMatch) {
                    return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
                }

                // Сохранение сессии
                req.session.userId = user.id;
                req.session.username = user.username;

                res.json({ 
                    message: 'Успешный вход',
                    user: {
                        id: user.id,
                        username: user.username
                    }
                });
            }
        );
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Выход
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка при выходе' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Успешный выход' });
    });
});

// Получение текущего пользователя
router.get('/me', requireAuth, (req, res) => {
    db.get(
        'SELECT id, username, created_at FROM users WHERE id = ?',
        [req.session.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
            }

            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            res.json({ user });
        }
    );
});

// Получение всех коллекций пользователя
router.get('/collections', requireAuth, (req, res) => {
    db.all(
        'SELECT id, name, items, created_at FROM collections WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.userId],
        (err, collections) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при получении коллекций' });
            }

            // Парсим JSON строки items
            const parsedCollections = collections.map(collection => ({
                ...collection,
                items: JSON.parse(collection.items)
            }));

            res.json({ collections: parsedCollections });
        }
    );
});

// Создание новой коллекции
router.post('/collections', requireAuth, (req, res) => {
    try {
        const { name, items } = req.body;

        if (!name || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Название и массив элементов обязательны' });
        }

        const itemsJson = JSON.stringify(items);

        db.run(
            'INSERT INTO collections (user_id, name, items) VALUES (?, ?, ?)',
            [req.session.userId, name, itemsJson],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Ошибка при создании коллекции' });
                }

                res.status(201).json({
                    message: 'Коллекция успешно создана',
                    collection: {
                        id: this.lastID,
                        name,
                        items
                    }
                });
            }
        );
    } catch (error) {
        console.error('Ошибка создания коллекции:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Удаление коллекции
router.delete('/collections/:id', requireAuth, (req, res) => {
    const collectionId = parseInt(req.params.id);

    if (isNaN(collectionId)) {
        return res.status(400).json({ error: 'Неверный ID коллекции' });
    }

    // Проверяем, что коллекция принадлежит пользователю
    db.get(
        'SELECT id FROM collections WHERE id = ? AND user_id = ?',
        [collectionId, req.session.userId],
        (err, collection) => {
            if (err) {
                return res.status(500).json({ error: 'Ошибка при проверке коллекции' });
            }

            if (!collection) {
                return res.status(404).json({ error: 'Коллекция не найдена' });
            }

            // Удаляем коллекцию
            db.run(
                'DELETE FROM collections WHERE id = ? AND user_id = ?',
                [collectionId, req.session.userId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Ошибка при удалении коллекции' });
                    }

                    res.json({ message: 'Коллекция успешно удалена' });
                }
            );
        }
    );
});

module.exports = router;
