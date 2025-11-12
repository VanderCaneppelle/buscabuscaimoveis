console.log('🚀 developers.js carregado!');

// Configuração da API
const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL - developers.js:', API_BASE_URL);

let currentUser = null;
let authToken = null;

function getApiBaseUrl() {
    if (window.location.hostname.includes('buscabusca-admin-qa')) {
        return 'https://buscabuscaimoveis-qa.vercel.app';
    } else if (window.location.hostname.includes('buscabusca-admin-prod')) {
        return 'https://buscabusca.vercel.app';
    }
    return 'https://buscabuscaimoveis-qa.vercel.app';
}

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');

    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
}

async function loginAdmin(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Login failed');
    }

    authToken = data.session.access_token;
    currentUser = data.user;
    localStorage.setItem('adminToken', authToken);
    localStorage.setItem('adminUser', JSON.stringify(currentUser));

    return data;
}

function logoutAdmin() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
}

// Elementos DOM
const loadingElement = document.getElementById('loading');
const loginScreen = document.getElementById('login-screen');
const mainAppElement = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const adminNameEl = document.getElementById('admin-name');
const loginError = document.getElementById('login-error');
const errorMessage = document.getElementById('error-message');

const developerSearchInput = document.getElementById('developer-search');
const developersTableBody = document.getElementById('developers-table-body');
const developersEmptyState = document.getElementById('developers-empty');
const openDeveloperModalBtn = document.getElementById('open-developer-modal');
const developerForm = document.getElementById('developer-form');
const developerSubmitBtn = document.getElementById('developer-submit-btn');

let developerModalInstance = null;
let developers = [];
let developerSearchTerm = '';
const developerPageSize = 20;
let listenersBound = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof bootstrap !== 'undefined') {
        const modalElement = document.getElementById('developer-modal');
        if (modalElement) {
            developerModalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        }
    }

    setupEventListeners();

    try {
        const savedToken = localStorage.getItem('adminToken');
        const savedUser = localStorage.getItem('adminUser');

        if (savedToken && savedUser) {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            await initializeDevelopersPanel(currentUser);
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showLoginScreen('Erro ao verificar autenticação');
    }
});

async function initializeDevelopersPanel(user) {
    try {
        await fetchDevelopersServer();
        showMainApp();

        if (adminNameEl) {
            adminNameEl.textContent = user.name || user.email;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar construtoras:', error);
        showError('Erro ao carregar construtoras. Verifique a conexão.');
    }
}

async function fetchDevelopersServer() {
    const params = new URLSearchParams();
    params.set('limit', developerPageSize);
    if (developerSearchTerm) {
        params.set('search', developerSearchTerm);
    }

    const result = await apiCall(`developers?${params.toString()}`);
    developers = result.data || [];
    renderDevelopers();
}

function renderDevelopers() {
    if (!developersTableBody || !developersEmptyState) return;

    if (!developers || developers.length === 0) {
        developersEmptyState.style.display = 'block';
        developersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-3">
                    Nenhuma construtora cadastrada.
                </td>
            </tr>
        `;
        return;
    }

    developersEmptyState.style.display = 'none';
    developersTableBody.innerHTML = developers.map(dev => `
        <tr>
            <td>
                <div class="fw-semibold">${dev.full_name || dev.name}</div>
                ${dev.name_composition ? `<small class="text-muted">${dev.name_composition}</small>` : ''}
            </td>
            <td>${dev.city_name ? `${dev.city_name}${dev.city_uf ? ' / ' + dev.city_uf : ''}` : '-'}</td>
            <td>${dev.phone || '-'}</td>
            <td>${dev.email || '-'}</td>
            <td>${dev.website ? `<a href="${normalizeUrl(dev.website)}" target="_blank" rel="noopener">Visitar</a>` : '-'}</td>
            <td>
                ${dev.is_active ? '<span class="badge bg-success">Ativa</span>' : '<span class="badge bg-secondary">Inativa</span>'}
                ${dev.is_verified ? '<span class="badge bg-primary ms-1">Verificada</span>' : ''}
            </td>
            <td>${dev.created_at ? formatDate(dev.created_at) : '-'}</td>
        </tr>
    `).join('');
}

function normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}

function setupEventListeners() {
    if (listenersBound) return;

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (developerSearchInput) {
        developerSearchInput.addEventListener('input', debounce(() => {
            developerSearchTerm = developerSearchInput.value.trim();
            fetchDevelopersServer().catch(error => {
                console.error('Erro ao atualizar lista:', error);
                showError('Erro ao buscar construtoras.');
            });
        }, 400));
    }

    if (openDeveloperModalBtn) {
        openDeveloperModalBtn.addEventListener('click', () => {
            if (developerForm) {
                developerForm.reset();
            }
            developerModalInstance?.show();
        });
    }

    if (developerForm) {
        developerForm.addEventListener('submit', handleDeveloperSubmit);
    }

    listenersBound = true;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
        showLoginError('Preencha email e senha.');
        return;
    }

    try {
        hideLoginError();
        const data = await loginAdmin(email, password);
        await initializeDevelopersPanel(data.user);
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showLoginError(error.message || 'Email ou senha incorretos');
    }
}

function handleLogout() {
    logoutAdmin();
    showLoginScreen();
}

async function handleDeveloperSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('developer-name')?.value?.trim();
    const nameComposition = document.getElementById('developer-name-composition')?.value?.trim();
    const city = document.getElementById('developer-city')?.value?.trim();
    const state = document.getElementById('developer-state')?.value?.trim();
    const phone = document.getElementById('developer-phone')?.value?.trim();
    const email = document.getElementById('developer-email')?.value?.trim();
    const website = document.getElementById('developer-website')?.value?.trim();
    const description = document.getElementById('developer-description')?.value?.trim();

    if (!name || !city || !phone) {
        showError('Preencha os campos obrigatórios: nome, cidade e telefone.');
        return;
    }

    developerSubmitBtn.disabled = true;
    const originalBtnContent = developerSubmitBtn.innerHTML;
    developerSubmitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Salvando...`;

    try {
        await apiCall('developers', {
            method: 'POST',
            body: JSON.stringify({
                name,
                nameComposition,
                cityName: city,
                cityUf: state,
                phone,
                email,
                website,
                description,
            })
        });

        showSuccess('Construtora cadastrada com sucesso!');
        developerForm.reset();
        developerModalInstance?.hide();
        await fetchDevelopersServer();
    } catch (error) {
        console.error('Erro ao cadastrar construtora:', error);
        showError(error.message || 'Erro ao cadastrar construtora.');
    } finally {
        developerSubmitBtn.disabled = false;
        developerSubmitBtn.innerHTML = originalBtnContent;
    }
}

function showMainApp() {
    loadingElement.style.display = 'none';
    loginScreen.style.display = 'none';
    mainAppElement.style.display = 'block';
}

function showLoginScreen(errorMsg = null) {
    loadingElement.style.display = 'none';
    mainAppElement.style.display = 'none';
    loginScreen.style.display = 'block';

    if (errorMsg) {
        showLoginError(errorMsg);
    }
}

function showLoginError(message) {
    if (loginError && errorMessage) {
        errorMessage.textContent = message;
        loginError.style.display = 'block';
    }
}

function hideLoginError() {
    if (loginError) {
        loginError.style.display = 'none';
    }
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert(`Erro: ${message}`);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

