const optionInput = document.getElementById('optionInput');
const addBtn = document.getElementById('addBtn');
const optionsList = document.getElementById('optionsList');
const spinBtn = document.getElementById('spinBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearListBtn = document.getElementById('clearListBtn');

let options = [];
let isSpinning = false;
const HISTORY_KEY = 'rouletteHistory';
const MAX_HISTORY_ITEMS = 10;

// Добавление варианта
function addOption() {
    const text = optionInput.value.trim();
    if (text && !isSpinning) {
        options.push(text);
        optionInput.value = '';
        renderOptions();
    }
}

// Удаление варианта
function removeOption(index) {
    if (!isSpinning) {
        options.splice(index, 1);
        renderOptions();
    }
}

// Очистка списка вариантов
function clearOptions() {
    if (isSpinning) return;
    
    options = [];
    optionInput.value = '';
    
    // Убираем подсветку победителя
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('highlighted', 'winner');
    });
    
    renderOptions();
}

// Отрисовка списка вариантов
function renderOptions() {
    if (options.length === 0) {
        optionsList.innerHTML = '<div class="empty-message">Добавьте варианты для выбора</div>';
        spinBtn.disabled = true;
        clearListBtn.style.display = 'none';
        return;
    }

    spinBtn.disabled = false;
    clearListBtn.style.display = 'inline-block';
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

// Кручение рулетки
function spinRoulette() {
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

            // Останавливаемся на случайном варианте
            if (delay >= maxDelay && iterations > minIterations) {
                const randomIndex = Math.floor(Math.random() * options.length);
                const winnerText = options[randomIndex];
                
                // Прокручиваем до случайного индекса
                if (currentIndex !== randomIndex) {
                    setTimeout(() => {
                        items.forEach(item => item.classList.remove('highlighted'));
                        if (items[randomIndex]) {
                            items[randomIndex].classList.add('highlighted', 'winner');
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
                        
                        // Сохраняем победителя в историю
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

// Инициализация
renderOptions();
renderHistory();
