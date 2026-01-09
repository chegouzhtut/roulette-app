const collectionsBtn = document.getElementById('collectionsBtn');
const collectionsDrawer = document.getElementById('collectionsDrawer');
const closeCollectionsDrawer = document.getElementById('closeCollectionsDrawer');
const collectionsList = document.getElementById('collectionsList');
const saveCollectionBtn = document.getElementById('saveCollectionBtn');

// Открытие меню коллекций
collectionsBtn.addEventListener('click', () => {
    collectionsDrawer.style.display = 'flex';
    loadCollections();
});

// Закрытие меню коллекций
closeCollectionsDrawer.addEventListener('click', () => {
    collectionsDrawer.style.display = 'none';
});

collectionsDrawer.addEventListener('click', (e) => {
    if (e.target === collectionsDrawer) {
        collectionsDrawer.style.display = 'none';
    }
});

// Элементы модального окна сохранения
const saveCollectionModal = document.getElementById('saveCollectionModal');
const closeSaveCollectionModal = document.getElementById('closeSaveCollectionModal');
const saveCollectionForm = document.getElementById('saveCollectionForm');
const collectionNameInput = document.getElementById('collectionNameInput');
const cancelSaveCollection = document.getElementById('cancelSaveCollection');
const saveCollectionError = document.getElementById('saveCollectionError');

// Открытие модального окна сохранения
saveCollectionBtn.addEventListener('click', () => {
    // Получаем текущие варианты из глобальной переменной options
    const currentOptions = window.options || [];
    
    if (currentOptions.length === 0) {
        alert('Список пуст. Добавьте варианты перед сохранением.');
        return;
    }
    
    saveCollectionModal.style.display = 'flex';
    collectionNameInput.value = '';
    saveCollectionError.textContent = '';
    collectionNameInput.focus();
});

// Закрытие модального окна сохранения
closeSaveCollectionModal.addEventListener('click', () => {
    saveCollectionModal.style.display = 'none';
});

cancelSaveCollection.addEventListener('click', () => {
    saveCollectionModal.style.display = 'none';
});

saveCollectionModal.addEventListener('click', (e) => {
    if (e.target === saveCollectionModal) {
        saveCollectionModal.style.display = 'none';
    }
});

// Сохранение коллекции
saveCollectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveCollectionError.textContent = '';
    
    const name = collectionNameInput.value.trim();
    
    if (!name) {
        saveCollectionError.textContent = 'Введите название списка';
        return;
    }
    
    // Получаем текущие варианты из глобальной переменной options
    const currentOptions = window.options || [];
    
    if (currentOptions.length === 0) {
        saveCollectionError.textContent = 'Список пуст. Добавьте варианты перед сохранением.';
        return;
    }
    
    try {
        const response = await fetch('/api/collections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                items: currentOptions
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            saveCollectionModal.style.display = 'none';
            saveCollectionForm.reset();
            loadCollections();
        } else {
            saveCollectionError.textContent = data.error || 'Ошибка при сохранении списка';
        }
    } catch (error) {
        console.error('Ошибка сохранения коллекции:', error);
        saveCollectionError.textContent = 'Ошибка соединения с сервером';
    }
});

// Загрузка коллекций
async function loadCollections() {
    try {
        const response = await fetch('/api/collections');
        
        if (!response.ok) {
            if (response.status === 401) {
                collectionsList.innerHTML = '<div class="empty-message">Войдите, чтобы видеть свои списки</div>';
                return;
            }
            throw new Error('Ошибка загрузки коллекций');
        }
        
        const data = await response.json();
        const collections = data.collections || [];
        
        if (collections.length === 0) {
            collectionsList.innerHTML = '<div class="empty-message">Нет сохраненных списков</div>';
            return;
        }
        
        collectionsList.innerHTML = collections.map(collection => `
            <div class="collection-item">
                <div class="collection-info">
                    <div class="collection-name">${escapeHtml(collection.name)}</div>
                    <div class="collection-count">${collection.items.length} вариантов</div>
                </div>
                <div class="collection-actions">
                    <button class="collection-apply-btn" data-id="${collection.id}" data-items='${JSON.stringify(collection.items)}'>Применить</button>
                    <button class="collection-delete-btn" data-id="${collection.id}">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // Обработчики для кнопок
        document.querySelectorAll('.collection-apply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const items = JSON.parse(btn.dataset.items);
                applyCollection(items);
                collectionsDrawer.style.display = 'none';
            });
        });
        
        document.querySelectorAll('.collection-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                if (confirm('Удалить этот список?')) {
                    await deleteCollection(id);
                }
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки коллекций:', error);
        collectionsList.innerHTML = '<div class="empty-message">Ошибка загрузки списков</div>';
    }
}

// Применение коллекции
function applyCollection(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return;
    }
    
    const currentRoomId = window.currentRoomId || null;
    
    if (currentRoomId) {
        // В мультиплеере: отправляем на сервер
        if (window.socket) {
            window.socket.emit('updateOptions', currentRoomId, items);
        }
    } else {
        // Одиночный режим: применяем локально
        if (typeof window.setOptions === 'function') {
            window.setOptions([...items]);
        } else if (window.options !== undefined) {
            window.options = [...items];
            if (typeof window.renderOptions === 'function') {
                window.renderOptions();
            }
        }
    }
}

// Удаление коллекции
async function deleteCollection(id) {
    try {
        const response = await fetch(`/api/collections/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadCollections();
        } else {
            alert(data.error || 'Ошибка при удалении списка');
        }
    } catch (error) {
        console.error('Ошибка удаления коллекции:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Экспорт функций
window.loadCollections = loadCollections;
window.applyCollection = applyCollection;
