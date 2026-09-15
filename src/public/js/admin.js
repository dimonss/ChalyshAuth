// State
const metaBase = document.querySelector('meta[name="base-url"]')?.getAttribute('content');
const API_BASE = (metaBase && metaBase !== '{{BASE_URL}}') ? metaBase : '/api';
let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let searchDebounceTimer = null;
let targetDeleteUserId = null;
let refreshPromise = null;

// Token Storage Helpers (standardized across projects on chalysh.pro)
function getAccessToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('chalysh_admin_token') || null;
}

function getRefreshToken() {
    return localStorage.getItem('refreshToken') || null;
}

function setTokens(access, refresh) {
    if (access) {
        localStorage.setItem('accessToken', access);
    } else {
        localStorage.removeItem('accessToken');
    }
    if (refresh) {
        localStorage.setItem('refreshToken', refresh);
    } else {
        localStorage.removeItem('refreshToken');
    }
    // Cleanup legacy key if present
    localStorage.removeItem('chalysh_admin_token');
}

function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('chalysh_admin_token');
}

// Refresh Access Token
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 401 || response.status === 403) {
                    clearTokens();
                }
                return false;
            }

            const data = await response.json();
            if (!data.accessToken || !data.refreshToken) {
                clearTokens();
                return false;
            }

            setTokens(data.accessToken, data.refreshToken);
            return true;
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// Synchronize auth state across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'accessToken' && !e.newValue) {
        currentUser = null;
        showLogin();
    }
});

// Elements
const viewLogin = document.getElementById('view-login');
const viewDashboard = document.getElementById('view-dashboard');
const headerUserPanel = document.getElementById('header-user-panel');
const adminEmailDisplay = document.getElementById('admin-email-display');
const adminAvatar = document.getElementById('admin-avatar');
const loginErrorBox = document.getElementById('login-error-box');
const telegramSigninWrapper = document.getElementById('telegram-signin-wrapper');
const googleSigninWrapper = document.getElementById('google-signin-wrapper');
const loginDivider = document.getElementById('login-divider');
const noAuthWarning = document.getElementById('no-auth-warning');

const statTotal = document.getElementById('stat-total');
const statTg = document.getElementById('stat-tg');
const statGoogle = document.getElementById('stat-google');
const statTokens = document.getElementById('stat-tokens');

const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('user-search-input');
const filterProvider = document.getElementById('filter-provider');
const filterSort = document.getElementById('filter-sort');
const paginationInfo = document.getElementById('pagination-info');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');

const userDialog = document.getElementById('user-dialog');
const deleteDialog = document.getElementById('delete-dialog');

// Toast Helper
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> <span>${message}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

// Authenticated Fetch with auto-refresh on 401
async function apiFetch(endpoint, options = {}) {
    let token = getAccessToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            token = getAccessToken();
            headers['Authorization'] = `Bearer ${token}`;
            response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });
        }
    }

    if (response.status === 401) {
        logout();
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    }

    return response;
}

// Init Application
async function init() {
    try {
        // Fetch public config
        const res = await fetch(`${API_BASE}/admin/config`);
        const config = await res.json();

        let hasTg = false;
        let hasGoogle = false;

        if (config.telegramBotUsername) {
            initTelegramAuth(config.telegramBotUsername);
            telegramSigninWrapper.classList.remove('hidden');
            hasTg = true;
        }

        if (config.googleClientId) {
            initGoogleAuth(config.googleClientId);
            googleSigninWrapper.classList.remove('hidden');
            hasGoogle = true;
        }

        if (hasTg && hasGoogle) {
            loginDivider.classList.remove('hidden');
        } else if (!hasTg && !hasGoogle) {
            noAuthWarning.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Config fetch failed', err);
    }

    if (getAccessToken() || getRefreshToken()) {
        await verifySession();
    } else {
        showLogin();
    }
}

// Initialize Telegram Login Widget
function initTelegramAuth(botUsername) {
    const container = document.getElementById('telegram-login-btn');
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
}

// Global callback for Telegram Login Widget
window.onTelegramAuth = async function (user) {
    loginErrorBox.style.display = 'none';
    try {
        const res = await fetch(`${API_BASE}/admin/auth/telegram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Ошибка авторизации через Telegram');
        }

        setTokens(data.accessToken, data.refreshToken);
        currentUser = data.user;

        showToast(`Добро пожаловать, ${currentUser.firstName}!`, 'success');
        showDashboard();
    } catch (err) {
        loginErrorBox.textContent = err.message;
        loginErrorBox.style.display = 'block';
        showToast(err.message, 'error');
    }
};

// Initialize Google GIS
function initGoogleAuth(clientId) {
    if (window.google && window.google.accounts) {
        renderGoogleButton(clientId);
    } else {
        window.addEventListener('load', () => {
            const checkGsi = setInterval(() => {
                if (window.google && window.google.accounts) {
                    clearInterval(checkGsi);
                    renderGoogleButton(clientId);
                }
            }, 100);
        });
    }
}

function renderGoogleButton(clientId) {
    google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleLogin,
        auto_select: false,
    });

    google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 280
        }
    );
}

// Handle Google Credential
async function handleGoogleLogin(response) {
    loginErrorBox.style.display = 'none';
    try {
        const res = await fetch(`${API_BASE}/admin/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Ошибка авторизации');
        }

        setTokens(data.accessToken, data.refreshToken);
        currentUser = data.user;

        showToast(`Добро пожаловать, ${currentUser.firstName}!`, 'success');
        showDashboard();
    } catch (err) {
        loginErrorBox.textContent = err.message;
        loginErrorBox.style.display = 'block';
        showToast(err.message, 'error');
    }
}

// Verify Stored Session
async function verifySession() {
    try {
        const res = await apiFetch('/admin/me');
        if (res.ok) {
            currentUser = await res.json();
            showDashboard();
        } else if (res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            showLogin();
            loginErrorBox.textContent = errData.message || 'Доступ запрещен: у вас нет прав администратора';
            loginErrorBox.style.display = 'block';
        } else {
            logout();
        }
    } catch {
        logout();
    }
}

function showLogin() {
    viewLogin.classList.remove('hidden');
    viewDashboard.classList.add('hidden');
    headerUserPanel.classList.add('hidden');
    if (loginErrorBox) {
        loginErrorBox.style.display = 'none';
        loginErrorBox.textContent = '';
    }
}

function showDashboard() {
    viewLogin.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
    headerUserPanel.classList.remove('hidden');

    if (currentUser) {
        const displayName = currentUser.email
            || (currentUser.username ? '@' + currentUser.username : null)
            || `${currentUser.firstName}${currentUser.lastName ? ' ' + currentUser.lastName : ''}`
            || 'Admin';
        adminEmailDisplay.textContent = displayName;
        if (currentUser.photoUrl) {
            adminAvatar.src = currentUser.photoUrl;
        }
    }

    loadStats();
    loadUsers();
}

async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
        } catch {
            // Ignore logout API error
        }
    }
    currentUser = null;
    clearTokens();
    showLogin();
}

document.getElementById('logout-btn').addEventListener('click', logout);

// Load Statistics
async function loadStats() {
    try {
        const res = await apiFetch('/admin/stats');
        if (!res.ok) return;
        const stats = await res.json();

        statTotal.textContent = stats.totalUsers;
        statTg.textContent = stats.telegramUsers;
        statGoogle.textContent = stats.googleUsers;
        statTokens.textContent = stats.activeRefreshTokens;
    } catch (err) {
        console.error('Stats error', err);
    }
}

// Load Users
async function loadUsers() {
    usersTableBody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="loading-spinner"></div> Загрузка списка пользователей...</td></tr>`;

    const [sortBy, sortOrder] = filterSort.value.split('-');
    const params = new URLSearchParams({
        page: currentPage,
        limit: 15,
        provider: filterProvider.value,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc',
    });

    const query = searchInput.value.trim();
    if (query) {
        params.append('search', query);
    }

    try {
        const res = await apiFetch(`/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error('Не удалось загрузить пользователей');

        const data = await res.json();
        renderUsersTable(data.users);

        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;

        const start = data.pagination.total === 0 ? 0 : (currentPage - 1) * data.pagination.limit + 1;
        const end = Math.min(currentPage * data.pagination.limit, data.pagination.total);
        paginationInfo.textContent = `Показано ${start}–${end} из ${data.pagination.total}`;

        btnPrevPage.disabled = currentPage <= 1;
        btnNextPage.disabled = currentPage >= totalPages;
    } catch (err) {
        usersTableBody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color: var(--danger);">✕ ${err.message}</td></tr>`;
    }
}

// Render Users Table
function renderUsersTable(users) {
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Пользователи не найдены</td></tr>`;
        return;
    }

    usersTableBody.innerHTML = users.map(u => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
        const initials = (u.firstName ? u.firstName[0] : 'U').toUpperCase();
        const avatarHtml = u.photoUrl 
            ? `<img src="${escapeHtml(u.photoUrl)}" alt="${escapeHtml(fullName)}" onerror="this.src=''; this.parentElement.innerText='${initials}'">`
            : initials;

        const tgBadge = u.telegramId 
            ? `<span class="badge badge-tg" title="Telegram ID: ${u.telegramId}">✈️ ${u.telegramId}</span>`
            : `<span class="badge-none">—</span>`;

        const googleBadge = u.googleId
            ? `<span class="badge badge-google" title="Google ID: ${u.googleId}">🌐 ${u.googleId.slice(0, 10)}...</span>`
            : `<span class="badge-none">—</span>`;

        const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '—';

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="avatar">${avatarHtml}</div>
                        <div class="user-info-text">
                            <span class="user-info-name">${escapeHtml(fullName)}</span>
                            <span class="user-info-handle">${u.username ? '@' + escapeHtml(u.username) : 'id: ' + u.id.slice(0, 8)}</span>
                        </div>
                    </div>
                </td>
                <td>${u.email ? escapeHtml(u.email) : '<span class="badge-none">—</span>'}</td>
                <td>${tgBadge}</td>
                <td>${googleBadge}</td>
                <td style="color: var(--text-muted); font-size: 0.8125rem;">${createdDate}</td>
                <td>
                    <div class="actions-cell">
                        <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${u.id}">Редактировать</button>
                        <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${u.id}" data-name="${escapeHtml(fullName)}">Удалить</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Search & Filter Events
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        currentPage = 1;
        loadUsers();
    }, 300);
});

filterProvider.addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
});

filterSort.addEventListener('change', () => {
    currentPage = 1;
    loadUsers();
});

document.getElementById('refresh-btn').addEventListener('click', () => {
    loadStats();
    loadUsers();
    showToast('Данные обновлены', 'info');
});

btnPrevPage.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadUsers();
    }
});

btnNextPage.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadUsers();
    }
});

// Edit User Dialog
async function openEditUser(userId) {
    try {
        const res = await apiFetch(`/admin/users/${userId}`);
        if (!res.ok) throw new Error('Не удалось получить данные пользователя');
        const user = await res.json();

        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('dialog-user-title').textContent = `${user.firstName} ${user.lastName || ''}`.trim() || 'Пользователь';

        document.getElementById('meta-user-id').textContent = user.id;
        document.getElementById('meta-user-tg').textContent = user.telegramId || '—';
        document.getElementById('meta-user-google').textContent = user.googleId || '—';
        document.getElementById('meta-user-created').textContent = user.createdAt || '—';

        document.getElementById('edit-first-name').value = user.firstName || '';
        document.getElementById('edit-last-name').value = user.lastName || '';
        document.getElementById('edit-username').value = user.username || '';
        document.getElementById('edit-email').value = user.email || '';

        const jsonFields = JSON.stringify(user.additionalFields || {}, null, 2);
        document.getElementById('edit-additional-fields').value = jsonFields;
        document.getElementById('json-status').textContent = '';

        userDialog.showModal();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function closeUserDialog() {
    userDialog.close();
}

function formatJsonFields() {
    const area = document.getElementById('edit-additional-fields');
    const status = document.getElementById('json-status');
    try {
        const parsed = JSON.parse(area.value || '{}');
        area.value = JSON.stringify(parsed, null, 2);
        status.className = 'json-status ok';
        status.textContent = 'JSON валиден';
    } catch (e) {
        status.className = 'json-status error';
        status.textContent = 'Ошибка: ' + e.message;
    }
}

async function saveUserForm(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-user-btn');
    const status = document.getElementById('json-status');
    const userId = document.getElementById('edit-user-id').value;

    let additionalFields = {};
    const jsonText = document.getElementById('edit-additional-fields').value.trim();
    if (jsonText) {
        try {
            additionalFields = JSON.parse(jsonText);
        } catch (e) {
            status.className = 'json-status error';
            status.textContent = 'Некорректный JSON в Additional Fields: ' + e.message;
            return;
        }
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="loading-spinner"></span> Сохранение...`;

    try {
        const payload = {
            firstName: document.getElementById('edit-first-name').value.trim(),
            lastName: document.getElementById('edit-last-name').value.trim() || null,
            username: document.getElementById('edit-username').value.trim() || null,
            email: document.getElementById('edit-email').value.trim() || null,
            additionalFields
        };

        const res = await apiFetch(`/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Ошибка обновления');
        }

        showToast('Пользователь успешно обновлен', 'success');
        closeUserDialog();
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Сохранить изменения';
    }
}

// Delete Dialog
function promptDeleteUser(userId, name) {
    targetDeleteUserId = userId;
    document.getElementById('delete-user-name').textContent = name || userId;
    deleteDialog.showModal();
}

function closeDeleteDialog() {
    deleteDialog.close();
    targetDeleteUserId = null;
}

async function executeDeleteUser() {
    if (!targetDeleteUserId) return;
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> Удаление...`;

    try {
        const res = await apiFetch(`/admin/users/${targetDeleteUserId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Ошибка при удалении');
        }

        showToast('Пользователь успешно удален', 'success');
        closeDeleteDialog();
        loadStats();
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Удалить пользователя';
    }
}

// Event Listeners for Dialogs & Actions
document.getElementById('edit-user-form')?.addEventListener('submit', saveUserForm);
document.getElementById('format-json-btn')?.addEventListener('click', formatJsonFields);
document.getElementById('user-dialog-close-btn')?.addEventListener('click', closeUserDialog);
document.getElementById('user-dialog-cancel-btn')?.addEventListener('click', closeUserDialog);

document.getElementById('delete-dialog-close-btn')?.addEventListener('click', closeDeleteDialog);
document.getElementById('delete-dialog-cancel-btn')?.addEventListener('click', closeDeleteDialog);
document.getElementById('confirm-delete-btn')?.addEventListener('click', executeDeleteUser);

// Delegated click handling for dynamically rendered user table buttons
usersTableBody?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    if (!id) return;

    if (action === 'edit') {
        openEditUser(id);
    } else if (action === 'delete') {
        const name = button.getAttribute('data-name') || '';
        promptDeleteUser(id, name);
    }
});

// Start
init();
