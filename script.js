const optionInput = document.getElementById('optionInput');
const addBtn = document.getElementById('addBtn');
const optionsList = document.getElementById('optionsList');
const spinBtn = document.getElementById('spinBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearListBtn = document.getElementById('clearListBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomInfo = document.getElementById('roomInfo');
const roomCode = document.getElementById('roomCode');
const copyLinkBtn = document.getElementById('copyLinkBtn');

// Инициализация Socket.io
const socket = io();

let options = [];
let isSpinning = false;
let currentRoomId = null;
const HISTORY_KEY = 'rouletteHistory';
const MAX_HISTORY_ITEMS = 10;

// Получение room ID из URL
function getRoomIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
}

// Генерация случайного ID комнаты
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Создание комнаты
function createRoom() {
    const roomId = generateRoomId();
    const newURL = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    window.location.href = newURL;
}

// Копирование ссылки
function copyRoomLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        copyLinkBtn.textContent = 'Скопировано!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Скопировать ссылку';
        }, 2000);
    });
}

// Инициализация комнаты
function initRoom() {
    const roomId = getRoomIdFromURL();
    if (roomId) {
        currentRoomId = roomId;
        roomCode.textContent = roomId;
        roomInfo.style.display = 'block';
        createRoomBtn.style.display = 'none';
        socket.emit('joinRoom', roomId);
    } else {
        roomInfo.style.display = 'none';
        createRoomBtn.style.display = 'inline-block';
    }
}

// Добавление варианта
function addOption() {
    const text = optionInput.value.trim();
    if (text && !isSpinning) {
        if (currentRoomId) {
            // В мультиплеере: отправляем на сервер, не меняем локально
            const newOptions = [...options, text];
            socket.emit('updateOptions', currentRoomId, newOptions);
            optionInput.value = '';
        } else {
            // Одиночный режим: меняем локально
            options.push(text);
            optionInput.value = '';
            renderOptions();
        }
    }
}

// Удаление варианта
function removeOption(index) {
    if (!isSpinning) {
        if (currentRoomId) {
            // В мультиплеере: отправляем на сервер, не меняем локально
            const newOptions = [...options];
            newOptions.splice(index, 1);
            socket.emit('updateOptions', currentRoomId, newOptions);
        } else {
            // Одиночный режим: меняем локально
            options.splice(index, 1);
            renderOptions();
        }
    }
}

// Очистка списка вариантов
function clearOptions() {
    if (isSpinning) return;
    
    if (!confirm('Вы уверены, что хотите очистить весь список вариантов?')) {
        return;
    }
    
    if (currentRoomId) {
        // В мультиплеере: отправляем на сервер
        socket.emit('updateOptions', currentRoomId, []);
        optionInput.value = '';
    } else {
        // Одиночный режим: меняем локально
        options = [];
        optionInput.value = '';
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('highlighted', 'winner');
        });
        renderOptions();
    }
}

// Отрисовка списка вариантов
function renderOptions() {
    if (options.length === 0) {
        optionsList.innerHTML = '<div class="empty-message">Добавьте варианты для выбора</div>';
        spinBtn.disabled = true;
        clearListBtn.classList.add('hidden');
        return;
    }

    spinBtn.disabled = false;
    clearListBtn.classList.remove('hidden');
    optionsList.innerHTML = options.map((option, index) => `
        <div class="option-item" data-index="${index}">
            <span class="option-text">${escapeHtml(option)}</span>
            <button class="delete-btn" onclick="removeOption(${index})" title="Удалить">×</button>
        </div>
    `).join('');
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Работа с историей
function getHistory() {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(winnerText) {
    const history = getHistory();
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    history.unshift({
        text: winnerText,
        time: timeString,
        timestamp: now.getTime()
    });
    
    // Оставляем только последние 10 записей
    if (history.length > MAX_HISTORY_ITEMS) {
        history.splice(MAX_HISTORY_ITEMS);
    }
    
    saveHistory(history);
    renderHistory();
}

function clearHistory() {
    if (confirm('Вы уверены, что хотите очистить историю?')) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }
}

function renderHistory() {
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-message">История пуста</div>';
        return;
    }
    
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-text">${escapeHtml(item.text)}</span>
            <span class="history-time">— ${item.time}</span>
        </div>
    `).join('');
}

// Запуск анимации рулетки
function startRouletteAnimation(winnerText) {
    if (options.length === 0 || isSpinning) return;

    isSpinning = true;
    spinBtn.disabled = true;
    addBtn.disabled = true;
    optionInput.disabled = true;

    // Убираем предыдущие подсветки
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('highlighted', 'winner');
    });

    const items = document.querySelectorAll('.option-item');
    const winnerIndex = options.indexOf(winnerText);
    
    if (winnerIndex === -1) return; // Победитель не найден

    let currentIndex = 0;
    let delay = 50; // Начальная задержка (быстро)
    const minDelay = 50;
    const maxDelay = 300;
    const acceleration = 1.1; // Коэффициент замедления
    let iterations = 0;
    const minIterations = 20; // Минимум итераций для эффекта

    function highlightNext() {
        // Убираем подсветку с предыдущего
        items.forEach(item => item.classList.remove('highlighted'));

        // Подсвечиваем текущий
        if (items[currentIndex]) {
            items[currentIndex].classList.add('highlighted');
        }

        currentIndex = (currentIndex + 1) % items.length;
        iterations++;

        // Замедляем анимацию
        if (iterations > minIterations) {
            delay = Math.min(delay * acceleration, maxDelay);
        }

        // Останавливаемся на победителе
        if (delay >= maxDelay && iterations > minIterations) {
            // Прокручиваем до индекса победителя
            if (currentIndex !== winnerIndex) {
                setTimeout(() => {
                    // Убираем все подсветки
                    items.forEach(item => {
                        item.classList.remove('highlighted', 'winner');
                    });
                    
                    // Устанавливаем победителя
                    if (items[winnerIndex]) {
                        items[winnerIndex].classList.add('winner');
                    }
                    
                    // Сохраняем победителя в историю
                    addToHistory(winnerText);
                    
                    // Восстанавливаем интерфейс
                    setTimeout(() => {
                        isSpinning = false;
                        spinBtn.disabled = false;
                        addBtn.disabled = false;
                        optionInput.disabled = false;
                        optionInput.focus();
                    }, 2000);
                }, delay);
            } else {
                setTimeout(() => {
                    items[currentIndex].classList.add('winner');
                    addToHistory(winnerText);
                    setTimeout(() => {
                        isSpinning = false;
                        spinBtn.disabled = false;
                        addBtn.disabled = false;
                        optionInput.disabled = false;
                        optionInput.focus();
                    }, 2000);
                }, delay);
            }
            return;
        }

        setTimeout(highlightNext, delay);
    }

    highlightNext();
}

// Кручение рулетки
function spinRoulette() {
    if (options.length === 0 || isSpinning) return;

    if (currentRoomId) {
        // В мультиплеере: выбираем случайного победителя и отправляем на сервер
        const randomIndex = Math.floor(Math.random() * options.length);
        const winnerText = options[randomIndex];
        socket.emit('spinWheel', currentRoomId, winnerText);
    } else {
        // Одиночный режим: запускаем локально
        const randomIndex = Math.floor(Math.random() * options.length);
        const winnerText = options[randomIndex];
        startRouletteAnimation(winnerText);
    }
}

// Socket.io обработчики событий
socket.on('optionsUpdated', (newOptions) => {
    options = newOptions;
    renderOptions();
});

socket.on('wheelSpun', (winnerText) => {
    startRouletteAnimation(winnerText);
});

// Обработчики событий
addBtn.addEventListener('click', addOption);

optionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isSpinning) {
        addOption();
    }
});

spinBtn.addEventListener('click', spinRoulette);
clearHistoryBtn.addEventListener('click', clearHistory);
clearListBtn.addEventListener('click', clearOptions);
createRoomBtn.addEventListener('click', createRoom);
copyLinkBtn.addEventListener('click', copyRoomLink);

// Инициализация
initRoom();
renderOptions();
renderHistory();
