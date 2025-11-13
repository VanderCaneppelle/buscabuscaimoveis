console.log('🚀 developers.js carregado!');

// Configuração da API
const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL - developers.js:', API_BASE_URL);

let currentUser = null;
let authToken = null;

function getApiBaseUrl() {
    const hostname = window.location.hostname;
    
    // Produção: admin.buscabuscaimoveis.com.br
    if (hostname === 'admin.buscabuscaimoveis.com.br' || hostname.includes('buscabusca-admin-prod')) {
        return 'https://api.buscabuscaimoveis.com.br';
    } 
    // QA: admin-qa.buscabuscaimoveis.com.br ou outros domínios de QA
    else if (hostname.includes('qa') || hostname.includes('buscabusca-admin-qa')) {
        return 'https://buscabuscaimoveis-qa.vercel.app';
    } 
    // Desenvolvimento local
    else {
        return 'https://buscabuscaimoveis-qa.vercel.app';
    }
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
const developersPaginationEl = document.getElementById('developers-pagination');
const developersPrevBtn = document.getElementById('developers-prev-page');
const developersNextBtn = document.getElementById('developers-next-page');
const developersCurrentPageEl = document.getElementById('developers-current-page');
const developersTotalPagesEl = document.getElementById('developers-total-pages');
const developersTotalCountEl = document.getElementById('developers-total-count');
const openDeveloperModalBtn = document.getElementById('open-developer-modal');
const developerForm = document.getElementById('developer-form');
const developerSubmitBtn = document.getElementById('developer-submit-btn');
const developerModalTitle = document.getElementById('developer-modal-title');

let developerModalInstance = null;
let developers = [];
let developerSearchTerm = '';
let developerCurrentPage = 1;
let developerPaginationInfo = { page: 1, pages: 1, total: 0 };
let editingDeveloperId = null;
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
    params.set('page', developerCurrentPage);
    params.set('includeInactive', 'true');
    if (developerSearchTerm) {
        params.set('search', developerSearchTerm);
    }

    const result = await apiCall(`developers?${params.toString()}`);
    developers = result.data || [];
    developerPaginationInfo = result.pagination || { page: 1, pages: 1, total: developers.length || 0 };

    if (developerPaginationInfo.pages && developerPaginationInfo.pages > 0 && developerCurrentPage > developerPaginationInfo.pages) {
        developerCurrentPage = developerPaginationInfo.pages;
        return fetchDevelopersServer();
    }

    renderDevelopers();
    renderDevelopersPagination();
}

function renderDevelopers() {
    if (!developersTableBody || !developersEmptyState) return;

    if (!developers || developers.length === 0) {
        developersEmptyState.style.display = 'block';
        developersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-3">
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
            <td class="text-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-primary edit-developer" data-id="${dev.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${dev.is_active
                        ? `<button class="btn btn-sm btn-outline-warning inactivate-developer" data-id="${dev.id}" title="Inativar">
                                <i class="fas fa-ban"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-success activate-developer" data-id="${dev.id}" title="Ativar">
                                <i class="fas fa-check"></i>
                           </button>`
                    }
                    <button class="btn btn-sm btn-outline-danger delete-developer" data-id="${dev.id}" title="Excluir definitivamente">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    bindDeveloperActionButtons();
}

function renderDevelopersPagination() {
    if (!developersPaginationEl || !developersPrevBtn || !developersNextBtn) return;

    const total = developerPaginationInfo.total || developers.length || 0;
    const totalPages = Math.max(1, developerPaginationInfo.pages || 1);
    const currentPage = Math.min(Math.max(developerPaginationInfo.page || developerCurrentPage, 1), totalPages);

    if (total <= developerPageSize) {
        developersPaginationEl.style.display = 'none';
    } else {
        developersPaginationEl.style.display = 'flex';
    }

    developersCurrentPageEl.textContent = currentPage;
    developersTotalPagesEl.textContent = totalPages;
    developersTotalCountEl.textContent = total;

    developersPrevBtn.disabled = currentPage <= 1;
    developersNextBtn.disabled = currentPage >= totalPages;
}

function bindDeveloperActionButtons() {
    document.querySelectorAll('.edit-developer').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const developer = developers.find(dev => dev.id === id);
            if (developer) {
                openDeveloperModalForEdit(developer);
            }
        });
    });

    document.querySelectorAll('.inactivate-developer').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            handleInactivateDeveloper(id);
        });
    });

    document.querySelectorAll('.activate-developer').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            handleActivateDeveloper(id);
        });
    });

    document.querySelectorAll('.delete-developer').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            handleDeleteDeveloper(id);
        });
    });
}

function openDeveloperModalForCreate() {
    editingDeveloperId = null;
    if (developerModalTitle) {
        developerModalTitle.innerHTML = `<i class="fas fa-building me-2 text-primary"></i>Nova Construtora`;
    }
    if (developerSubmitBtn) {
        developerSubmitBtn.innerHTML = `<i class="fas fa-save me-2"></i>Salvar construtora`;
    }
    if (developerForm) {
        developerForm.reset();
    }
    developerModalInstance?.show();
}

function openDeveloperModalForEdit(developer) {
    editingDeveloperId = developer.id;
    if (developerModalTitle) {
        developerModalTitle.innerHTML = `<i class="fas fa-building me-2 text-primary"></i>Editar Construtora`;
    }
    if (developerSubmitBtn) {
        developerSubmitBtn.innerHTML = `<i class="fas fa-save me-2"></i>Salvar alterações`;
    }
    if (developerForm) {
        document.getElementById('developer-name').value = developer.name || '';
        document.getElementById('developer-name-composition').value = developer.name_composition || '';
        document.getElementById('developer-city').value = developer.city_name || '';
        document.getElementById('developer-state').value = developer.city_uf || '';
        document.getElementById('developer-phone').value = developer.phone || '';
        document.getElementById('developer-email').value = developer.email || '';
        document.getElementById('developer-website').value = developer.website || '';
        document.getElementById('developer-description').value = developer.description || '';
    }
    developerModalInstance?.show();
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
            developerCurrentPage = 1;
            fetchDevelopersServer().catch(error => {
                console.error('Erro ao atualizar lista:', error);
                showError('Erro ao buscar construtoras.');
            });
        }, 400));
    }

    if (openDeveloperModalBtn) {
        openDeveloperModalBtn.addEventListener('click', openDeveloperModalForCreate);
    }

    if (developerForm) {
        developerForm.addEventListener('submit', handleDeveloperSubmit);
    }

    if (developersPrevBtn) {
        developersPrevBtn.addEventListener('click', () => {
            if (developerCurrentPage > 1) {
                developerCurrentPage -= 1;
                fetchDevelopersServer().catch(error => {
                    console.error('Erro ao mudar página:', error);
                    showError('Erro ao carregar página anterior.');
                });
            }
        });
    }

    if (developersNextBtn) {
        developersNextBtn.addEventListener('click', () => {
            const totalPages = Math.max(1, developerPaginationInfo.pages || 1);
            if (developerCurrentPage < totalPages) {
                developerCurrentPage += 1;
                fetchDevelopersServer().catch(error => {
                    console.error('Erro ao mudar página:', error);
                    showError('Erro ao carregar próxima página.');
                });
            }
        });
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

    const payload = {
        name,
        nameComposition,
        cityName: city,
        cityUf: state,
        phone,
        email,
        website,
        description,
    };

    try {
        if (editingDeveloperId) {
            await apiCall('developers', {
                method: 'PUT',
                body: JSON.stringify({
                    id: editingDeveloperId,
                    ...payload,
                })
            });
            showSuccess('Construtora atualizada com sucesso!');
        } else {
            await apiCall('developers', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showSuccess('Construtora cadastrada com sucesso!');
        }

        developerForm.reset();
        developerModalInstance?.hide();
        await fetchDevelopersServer();
    } catch (error) {
        console.error('Erro ao cadastrar construtora:', error);
        showError(error.message || 'Erro ao salvar construtora.');
    } finally {
        developerSubmitBtn.disabled = false;
        developerSubmitBtn.innerHTML = originalBtnContent;
        editingDeveloperId = null;
    }
}

async function handleDeleteDeveloper(id) {
    if (!id) return;
    const confirmed = confirm('Tem certeza que deseja excluir PERMANENTEMENTE esta construtora?\nEsta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
        await apiCall('developers', {
            method: 'DELETE',
            body: JSON.stringify({ id, hardDelete: true })
        });
        showSuccess('Construtora excluída permanentemente!');
        await fetchDevelopersServer();
    } catch (error) {
        console.error('Erro ao excluir construtora:', error);
        showError(error.message || 'Erro ao excluir construtora.');
    }
}

async function handleInactivateDeveloper(id) {
    if (!id) return;
    const confirmed = confirm('Deseja inativar esta construtora?\nEla deixará de aparecer na criação de anúncios.');
    if (!confirmed) return;

    try {
        await apiCall('developers', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        });
        showSuccess('Construtora inativada com sucesso!');
        await fetchDevelopersServer();
    } catch (error) {
        console.error('Erro ao inativar construtora:', error);
        showError(error.message || 'Erro ao inativar construtora.');
    }
}

async function handleActivateDeveloper(id) {
    if (!id) return;

    try {
        await apiCall('developers', {
            method: 'PUT',
            body: JSON.stringify({ id, isActive: true })
        });
        showSuccess('Construtora ativada com sucesso!');
        await fetchDevelopersServer();
    } catch (error) {
        console.error('Erro ao ativar construtora:', error);
        showError(error.message || 'Erro ao ativar construtora.');
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

