const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userSection = document.getElementById('userSection');
const usernameDisplay = document.getElementById('usernameDisplay');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const tabButtons = document.querySelectorAll('.tab-btn');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');

let currentUser = null;

// Переключение вкладок
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Убираем активный класс со всех
        tabButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        // Добавляем активный класс
        btn.classList.add('active');
        if (tab === 'login') {
            loginTab.classList.add('active');
        } else {
            registerTab.classList.add('active');
        }
        
        // Очищаем ошибки
        loginError.textContent = '';
        registerError.textContent = '';
    });
});

// Открытие модального окна
loginBtn.addEventListener('click', () => {
    authModal.style.display = 'flex';
    // Сбрасываем формы
    loginForm.reset();
    registerForm.reset();
    loginError.textContent = '';
    registerError.textContent = '';
});

// Закрытие модального окна
closeAuthModal.addEventListener('click', () => {
    authModal.style.display = 'none';
});

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
    }
});

// Вход
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        loginError.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUI();
            authModal.style.display = 'none';
            loginForm.reset();
        } else {
            loginError.textContent = data.error || 'Ошибка входа';
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        loginError.textContent = 'Ошибка соединения с сервером';
    }
});

// Регистрация
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (!username || !password) {
        registerError.textContent = 'Заполните все поля';
        return;
    }
    
    if (password.length < 6) {
        registerError.textContent = 'Пароль должен быть не менее 6 символов';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // После регистрации автоматически входим
            const loginResponse = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const loginData = await loginResponse.json();
            
            if (loginResponse.ok) {
                currentUser = loginData.user;
                updateUI();
                authModal.style.display = 'none';
                registerForm.reset();
            } else {
                registerError.textContent = 'Регистрация успешна, но вход не выполнен';
            }
        } else {
            registerError.textContent = data.error || 'Ошибка регистрации';
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        registerError.textContent = 'Ошибка соединения с сервером';
    }
});

// Выход
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            currentUser = null;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
});

// Обновление UI
function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        userSection.style.display = 'flex';
        usernameDisplay.textContent = currentUser.username;
        // Показываем кнопку коллекций
        if (document.getElementById('collectionsBtn')) {
            document.getElementById('collectionsBtn').style.display = 'inline-block';
        }
    } else {
        loginBtn.style.display = 'inline-block';
        userSection.style.display = 'none';
        // Скрываем кнопку коллекций
        if (document.getElementById('collectionsBtn')) {
            document.getElementById('collectionsBtn').style.display = 'none';
        }
    }
}

// Проверка авторизации при загрузке
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUI();
            // Загружаем коллекции если они есть
            if (typeof loadCollections === 'function') {
                loadCollections();
            }
        } else {
            currentUser = null;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        currentUser = null;
        updateUI();
    }
}

// Экспорт для использования в других файлах
window.getCurrentUser = () => currentUser;
window.checkAuth = checkAuth;

// Проверка при загрузке страницы
checkAuth();
