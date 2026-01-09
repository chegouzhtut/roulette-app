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
const themeToggleBtn = document.getElementById('themeToggleBtn');
const presetsContainer = document.getElementById('presetsContainer');

// Инициализация Socket.io
const socket = io();

// Экспорт socket для использования в других модулях
window.socket = socket;

let options = [];
let isSpinning = false;
let currentRoomId = null;

// Экспорт переменных для использования в других модулях
window.options = options;
window.currentRoomId = currentRoomId;
const HISTORY_KEY = 'rouletteHistory';
const MAX_HISTORY_ITEMS = 10;

// Конфигурация пресетов
const PRESETS = {
    food: { label: '🍔 Еда', items: ['Пицца 🍕', 'Суши 🍣', 'Бургеры 🍔', 'Паста 🍝', 'Шаурма 🌯', 'Вок 🥡'] },
    movies: { label: '🎬 Кино', items: ['Комедия 😂', 'Ужасы 👻', 'Боевик 💥', 'Драма 🎭', 'Фантастика 👽'] },
    activities: { label: '🎉 Туса', items: ['Правда/Действие', 'Я никогда не...', 'Крокодил', 'Караоке', 'Танцы'] },
    dice: { label: '🎲 Кубик', items: ['1', '2', '3', '4', '5', '6'] },
    yesno: { label: '🔮 Да/Нет', items: ['Да ✅', 'Нет ❌', 'Возможно 🤷‍♂️'] }
};

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
        window.currentRoomId = currentRoomId; // Обновляем глобальную переменную
        roomCode.textContent = roomId;
        roomInfo.style.display = 'block';
        createRoomBtn.style.display = 'none';
        socket.emit('joinRoom', roomId);
    } else {
        roomInfo.style.display = 'none';
        createRoomBtn.style.display = 'inline-block';
    }
}

// Переключение темы
function toggleTheme() {
    const body = document.body;
    const html = document.documentElement;
    const isLightMode = html.classList.contains('light-mode');
    
    if (isLightMode) {
        html.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '🌓';
    } else {
        html.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '🌙';
    }
}

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const html = document.documentElement;
    
    if (savedTheme === 'light') {
        html.classList.add('light-mode');
        themeToggleBtn.textContent = '🌙';
    } else {
        html.classList.remove('light-mode');
        themeToggleBtn.textContent = '🌓';
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
            window.options = options; // Обновляем глобальную переменную
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
            window.options = options; // Обновляем глобальную переменную
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
        window.options = options; // Обновляем глобальную переменную
        optionInput.value = '';
        resetStyles();
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

// Экспорт функции для использования в других модулях
window.renderOptions = renderOptions;

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

// Сброс всех стилей элементов списка
function resetStyles() {
    // Отменяем текущую анимацию, если она активна
    if (window.currentAnimationTimeoutId) {
        clearTimeout(window.currentAnimationTimeoutId);
        window.currentAnimationTimeoutId = null;
    }
    
    const items = document.querySelectorAll('.option-item');
    items.forEach(item => {
        // Убираем все классы активности
        item.classList.remove('highlighted', 'winner', 'active', 'highlight');
        // Убираем инлайновые стили transform
        item.style.transform = '';
        item.style.scale = '';
        item.style.border = '';
        item.style.boxShadow = '';
    });
}

// Эффекты победы
function playWinEffects() {
    // Запуск конфетти
    if (typeof confetti !== 'undefined') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Запуск анимации рулетки
function startRouletteAnimation(winnerText) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:283',message:'startRouletteAnimation entry',data:{winnerText,optionsLength:options.length,options:options.slice(),isSpinning,itemsCount:document.querySelectorAll('.option-item').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (options.length === 0 || isSpinning) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:285',message:'startRouletteAnimation early return',data:{optionsLength:options.length,isSpinning},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    addBtn.disabled = true;
    optionInput.disabled = true;

    // Сбрасываем все стили перед началом вращения
    resetStyles();

    const items = document.querySelectorAll('.option-item');
    const winnerIndex = options.indexOf(winnerText);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:315',message:'winnerIndex calculated',data:{winnerText,winnerIndex,options:options.slice(),itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (winnerIndex === -1) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:321',message:'winner not found in options',data:{winnerText,options:options.slice()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Победитель не найден - восстанавливаем интерфейс
        isSpinning = false;
        spinBtn.disabled = false;
        addBtn.disabled = false;
        optionInput.disabled = false;
        return;
    }

    // Буфер старта для синхронизации (500ms)
    setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:333',message:'animation starting after buffer',data:{winnerText,winnerIndex,optionsLength:options.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Вычисляем общее количество шагов
        const minCycles = 4; // Минимум 4 полных круга
        const startIndex = 0;
        let totalSteps;
        
        if (winnerIndex >= startIndex) {
            totalSteps = (options.length * minCycles) + (winnerIndex - startIndex);
        } else {
            // Если winnerIndex меньше startIndex, нужно пройти полный круг
            totalSteps = (options.length * minCycles) + (options.length - startIndex) + winnerIndex;
        }
        
        let currentStep = 0;
        let currentTimeoutId = null;
        
        // Функция показа победителя
        function showWinner() {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:349',message:'showWinner called',data:{winnerText,winnerIndex,currentStep,totalSteps},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            
            // Убираем highlight со всех элементов
            items.forEach(item => item.classList.remove('highlight'));
            
            // Устанавливаем победителя
            if (items[winnerIndex]) {
                items[winnerIndex].classList.add('winner');
            }
            
            // Сохраняем победителя в историю
            addToHistory(winnerText);
            
            // Эффекты победы
            playWinEffects();
            
            // Восстанавливаем интерфейс
            setTimeout(() => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:370',message:'animation completed, restoring UI',data:{winnerText,winnerIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                isSpinning = false;
                spinBtn.disabled = false;
                addBtn.disabled = false;
                optionInput.disabled = false;
                optionInput.focus();
            }, 2000);
        }
        
        // Рекурсивная функция для выполнения шагов
        function runStep() {
            // Вычисляем текущий индекс для подсветки
            const currentIndex = (startIndex + currentStep) % options.length;
            
            // Убираем подсветку со всех элементов
            items.forEach(item => item.classList.remove('highlight'));
            
            // Подсвечиваем текущий элемент
            if (items[currentIndex]) {
                items[currentIndex].classList.add('highlight');
            }
            
            // Проверяем, достигли ли финиша
            if (currentStep === totalSteps) {
                // Это последний шаг - сразу показываем победителя с минимальной задержкой
                setTimeout(showWinner, 100);
                return; // Завершаем анимацию
            }
            
            // Вычисляем задержку для следующего шага (квадратичное замедление)
            // Новая формула: delay = 50 + (250 * (t/d) * (t/d))
            // где t = currentStep, d = totalSteps
            // Диапазон: от 50ms до 300ms
            const progress = currentStep / totalSteps;
            const delay = 50 + (250 * progress * progress);
            
            // Переходим к следующему шагу
            currentStep++;
            
            // Планируем следующий шаг
            currentTimeoutId = setTimeout(runStep, delay);
        }
        
        // Сохраняем ID таймера для возможной отмены
        window.currentAnimationTimeoutId = currentTimeoutId;
        
        // Запускаем первый шаг
        runStep();
    }, 500); // Буфер старта 500ms
}

// Кручение рулетки
function spinRoulette() {
    if (options.length === 0 || isSpinning) return;

    if (currentRoomId) {
        // В мультиплеере: выбираем случайного победителя и отправляем на сервер
        const randomIndex = Math.floor(Math.random() * options.length);
        const winnerText = options[randomIndex];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:391',message:'spinRoulette sending spinWheel',data:{currentRoomId,randomIndex,winnerText,optionsLength:options.length,options:options.slice()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        socket.emit('spinWheel', currentRoomId, winnerText);
    } else {
        // Одиночный режим: запускаем локально
        const randomIndex = Math.floor(Math.random() * options.length);
        const winnerText = options[randomIndex];
        startRouletteAnimation(winnerText);
    }
}

// Функция для установки options (для использования в других модулях)
function setOptions(newOptions) {
    options = newOptions;
    window.options = options;
    renderOptions();
}

// Экспорт функции
window.setOptions = setOptions;

// Socket.io обработчики событий
socket.on('optionsUpdated', (newOptions) => {
    setOptions(newOptions);
});

socket.on('wheelSpun', (winnerText) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5fbeb120-b790-4467-9560-7d0a9211241b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'script.js:422',message:'wheelSpun received',data:{winnerText,optionsLength:options.length,options:options.slice(),isSpinning,currentRoomId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
themeToggleBtn.addEventListener('click', toggleTheme);

// Отрисовка пресетов
function renderPresets() {
    presetsContainer.innerHTML = '';
    
    Object.keys(PRESETS).forEach(key => {
        const preset = PRESETS[key];
        const chip = document.createElement('button');
        chip.className = 'preset-chip';
        chip.textContent = preset.label;
        chip.addEventListener('click', () => applyPreset(key));
        presetsContainer.appendChild(chip);
    });
}

// Применение пресета
function applyPreset(presetKey) {
    if (isSpinning) return;
    
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    // Очищаем поле ввода
    optionInput.value = '';
    
    if (currentRoomId) {
        // В мультиплеере: отправляем на сервер
        socket.emit('updateOptions', currentRoomId, preset.items);
        } else {
            // Одиночный режим: применяем локально
            options = [...preset.items];
            window.options = options; // Обновляем глобальную переменную
            renderOptions();
        }
}

// Инициализация
initTheme();
initRoom();
renderPresets();
renderOptions();
renderHistory();
