
console.log('🚀 Admin.js carregado!');

// Configuração da API
const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL - admin.js:', API_BASE_URL);

// Estado de autenticação
let currentUser = null;
let authToken = null;

// Função para obter URL da API baseada no ambiente
function getApiBaseUrl() {
    // Detectar ambiente baseado na URL atual
    if (window.location.hostname.includes('buscabuscaimoveis-admin-qa')) {
        return 'https://buscabuscaimoveis-qa.vercel.app';
    } else if (window.location.hostname.includes('buscabuscaimoveis-admin-prod')) {
        return 'https://buscabusca.vercel.app';
    } else {
        // Desenvolvimento local
        return 'https://buscabuscaimoveis-qa.vercel.app';
    }
}

// Função para chamadas autenticadas à API
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}backend/api/admin/${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// Função de login
async function loginAdmin(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}backend/api/admin/login`, {
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

        // Salvar token e dados do usuário
        authToken = data.session.access_token;
        currentUser = data.user;
        localStorage.setItem('adminToken', authToken);
        localStorage.setItem('adminUser', JSON.stringify(currentUser));

        console.log('✅ Login admin bem-sucedido:', currentUser.email);
        return data;
    } catch (error) {
        console.error('❌ Erro no login:', error);
        throw error;
    }
}

// Função de logout
function logoutAdmin() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    console.log('✅ Logout realizado');
}

// Estado da aplicação
let properties = [];
let filteredProperties = [];
let totalCount = 0;
const PAGE_SIZE = 5;
let currentPage = 1; // 1-based
let listenersBound = false;
let currentFilters = {
    status: '',
    propertyType: '',
    city: ''
};

// Elementos DOM
const loadingElement = document.getElementById('loading');
const loginScreen = document.getElementById('login-screen');
const mainAppElement = document.getElementById('main-app');
const propertiesContainer = document.getElementById('properties-container');
const statusFilter = document.getElementById('status-filter');
const typeFilter = document.getElementById('type-filter');
const cityFilter = document.getElementById('city-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const loginForm = document.getElementById('login-form');
// Pagination elements
const paginationEl = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');
const totalCountEl = document.getElementById('total-count');
const logoutBtn = document.getElementById('logout-btn');
const adminName = document.getElementById('admin-name');
const loginError = document.getElementById('login-error');
const errorMessage = document.getElementById('error-message');

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 DOM carregado, inicializando aplicação...');

    // Configurar event listeners imediatamente
    setupEventListeners();

    try {
        // Verificar se já está logado
        console.log('🔍 Verificando sessão existente...');
        const savedToken = localStorage.getItem('adminToken');
        const savedUser = localStorage.getItem('adminUser');
        
        if (savedToken && savedUser) {
            console.log('👤 Usuário já logado:', JSON.parse(savedUser).email);
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            await initializeAdminPanel(currentUser);
        } else {
            console.log('🔐 Nenhuma sessão encontrada, mostrando tela de login');
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showLoginScreen('Erro ao verificar autenticação');
    }
});

// Função removida - verificação de admin agora é feita no backend via API

// Inicializar painel admin
async function initializeAdminPanel(user) {
    try {
        console.log('📊 Carregando propriedades (paginado)...');
        await fetchPropertiesServer();

        console.log('🎯 Configurando event listeners...');
        setupEventListeners();

        console.log('📈 Atualizando estatísticas...');
        await updateStatsServer();
        bindStatsCardClicks();

        console.log('🖥️ Mostrando painel principal...');
        showMainApp();

        // Atualizar nome do admin
        console.log('👤 Atualizando nome do admin...');
        adminName.textContent = user.name || user.email;
        console.log('✅ Painel admin inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar painel:', error);
        showError('Erro ao carregar dados. Verifique a conexão.');
    }
}

// Carregar propriedades via API segura
async function fetchPropertiesServer() {
    try {
        const status = statusFilter.value;
        const propertyType = typeFilter.value;
        const city = cityFilter.value.trim();

        const data = await apiCall('properties', {
            method: 'GET',
            // Parâmetros via query string
        });

        // Construir query string
        const params = new URLSearchParams({
            page: currentPage,
            limit: PAGE_SIZE
        });
        
        if (status) params.append('status', status);
        if (propertyType) params.append('propertyType', propertyType);
        if (city) params.append('city', city);

        const response = await fetch(`${API_BASE_URL}backend/api/admin/properties?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        properties = result.data || [];
        filteredProperties = properties;
        totalCount = result.pagination?.total || 0;

        renderProperties();
        updatePaginationUI();
    } catch (error) {
        console.error('Erro ao buscar propriedades (API):', error);
        showError('Erro ao carregar lista.');
    }
}

// Configurar event listeners
function setupEventListeners() {
    if (listenersBound) return; // evitar listeners duplicados
    console.log('🎯 Configurando event listeners...');

    // Login
    if (loginForm) {
        console.log('✅ Login form encontrado, adicionando listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('❌ Login form não encontrado!');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Filtros
    applyFiltersBtn.addEventListener('click', () => { currentPage = 1; fetchPropertiesServer().then(updateStatsServer); });

    // Filtros em tempo real
    statusFilter.addEventListener('change', () => { currentPage = 1; fetchPropertiesServer().then(updateStatsServer); });
    typeFilter.addEventListener('change', () => { currentPage = 1; fetchPropertiesServer().then(updateStatsServer); });
    cityFilter.addEventListener('input', debounce(() => { currentPage = 1; fetchPropertiesServer().then(updateStatsServer); }, 400));

    if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) { currentPage -= 1; fetchPropertiesServer(); }
    });
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        if (currentPage < totalPages) { currentPage += 1; fetchPropertiesServer(); }
    });

    listenersBound = true;
}

// Handle login
async function handleLogin(event) {
    console.log('🎯 Evento de login capturado!');
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log('🔐 Tentando login com:', email);

    try {
        hideLoginError();

        // Usar nova função de login via API
        const data = await loginAdmin(email, password);
        
        console.log('✅ Login bem-sucedido para usuário:', data.user.id);
        console.log('🚀 Inicializando painel admin...');
        await initializeAdminPanel(data.user);
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showLoginError(error.message || 'Email ou senha incorretos');
    }
}

// Handle logout
async function handleLogout() {
    try {
        logoutAdmin();
        showLoginScreen();
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Mostrar tela de login
function showLoginScreen(errorMsg = null) {
    loadingElement.style.display = 'none';
    mainAppElement.style.display = 'none';
    loginScreen.style.display = 'block';

    if (errorMsg) {
        showLoginError(errorMsg);
    }
}

// Mostrar erro de login
function showLoginError(message) {
    errorMessage.textContent = message;
    loginError.style.display = 'block';
}

// Esconder erro de login
function hideLoginError() {
    loginError.style.display = 'none';
}

// Aplicar filtros (server-side)
function applyFilters() { currentPage = 1; fetchPropertiesServer().then(updateStatsServer); }

// Renderizar propriedades
function renderProperties() {
    if (filteredProperties.length === 0) {
        propertiesContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4 class="text-muted">Nenhum anúncio encontrado</h4>
                <p class="text-muted">Tente ajustar os filtros ou não há anúncios com os critérios selecionados.</p>
            </div>
        `;
        return;
    }

    propertiesContainer.innerHTML = filteredProperties.map(property => `
        <div class="property-card" data-id="${property.id}">
            <div class="row">
                <div class="col-md-4">
                    <div class="property-images">
                        ${renderPropertyImages(property.images)}
                        ${property.images && Array.isArray(property.images) && property.images.length > 1 ?
            `<div class="image-counter">1/${property.images.length}</div>` : ''}
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="property-info">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="mb-0">${property.title}</h5>
                            <span class="badge ${getStatusBadgeClass(property.status)}">
                                ${getStatusText(property.status)}
                            </span>
                        </div>
                        
                        <p class="text-muted mb-2">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${property.neighborhood}, ${property.city}
                        </p>
                        
                        <div class="row mb-2">
                            <div class="col-6">
                                <strong class="text-primary">R$ ${formatPrice(property.price)}</strong>
                            </div>
                            <div class="col-6 text-end">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>
                                    ${formatDate(property.created_at)}
                                </small>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-12">
                                <small class="text-muted">
                                    ${property.bedrooms ? `<i class="fas fa-bed me-1"></i>${property.bedrooms} quartos` : ''}
                                    ${property.bathrooms ? `<i class="fas fa-bath ms-3 me-1"></i>${property.bathrooms} banheiros` : ''}
                                    ${property.area ? `<i class="fas fa-ruler-combined ms-3 me-1"></i>${property.area}m²` : ''}
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge bg-secondary me-1">${property.property_type}</span>
                                <span class="badge bg-info">${property.transaction_type}</span>
                            </div>
                            
                            <div class="btn-group">
                                ${property.status === 'pending' ? `
                                    <button class="btn btn-success btn-sm btn-action" onclick="approveProperty('${property.id}')">
                                        <i class="fas fa-check me-1"></i>Aprovar
                                    </button>
                                    <button class="btn btn-danger btn-sm btn-action" onclick="rejectProperty('${property.id}')">
                                        <i class="fas fa-times me-1"></i>Rejeitar
                                    </button>
                                ` : ''}
                                
                                <button class="btn btn-primary btn-sm btn-action" onclick="viewPropertyDetails('${property.id}')">
                                    <i class="fas fa-eye me-1"></i>Ver Detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Tornar card inteiro clicável para abrir detalhes
    Array.from(propertiesContainer.querySelectorAll('.property-card')).forEach(card => {
        card.addEventListener('click', (e) => {
            // Evitar conflito com botões internos
            const isButton = e.target.closest('button');
            if (isButton) return;
            const id = card.getAttribute('data-id');
            if (id) viewPropertyDetails(id);
        });
    });
}

function updatePaginationUI() {
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (paginationEl) paginationEl.style.display = totalCount > PAGE_SIZE ? 'flex' : 'none';
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

// Estatísticas via servidor (contagens reais, sem depender da página atual)
async function updateStatsServer() {
    try {
        const totalPromise = supabase
            .from('properties')
            .select('id', { count: 'exact', head: true });

        const pendingPromise = supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        const approvedPromise = supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'approved');

        const rejectedPromise = supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'rejected');

        const [{ count: total }, { count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
            totalPromise, pendingPromise, approvedPromise, rejectedPromise
        ]);

        document.getElementById('total-properties').textContent = total ?? 0;
        document.getElementById('pending-properties').textContent = pending ?? 0;
        document.getElementById('approved-properties').textContent = approved ?? 0;
        document.getElementById('rejected-properties').textContent = rejected ?? 0;
    } catch (err) {
        console.error('Erro ao atualizar estatísticas:', err);
    }
}

function bindStatsCardClicks() {
    // Deixar cards clicáveis para aplicar filtros (server-side)
    const totalCard = document.getElementById('total-properties').closest('.stats-card');
    const pendingCard = document.getElementById('pending-properties').closest('.stats-card');
    const approvedCard = document.getElementById('approved-properties').closest('.stats-card');
    const rejectedCard = document.getElementById('rejected-properties').closest('.stats-card');

    if (totalCard) totalCard.onclick = () => { statusFilter.value = ''; applyFilters(); };
    if (pendingCard) pendingCard.onclick = () => { statusFilter.value = 'pending'; applyFilters(); };
    if (approvedCard) approvedCard.onclick = () => { statusFilter.value = 'approved'; applyFilters(); };
    if (rejectedCard) rejectedCard.onclick = () => { statusFilter.value = 'rejected'; applyFilters(); };
}

// Renderizar imagens da propriedade
function renderPropertyImages(images) {
    if (!images || images.length === 0) {
        return '<img src="https://via.placeholder.com/400x200?text=Sem+Imagem" alt="Sem imagem">';
    }

    // Filtrar apenas imagens (excluir vídeos) e garantir que img não seja null/undefined
    const imageFiles = images.filter(img => {
        // Verificar se img existe e é uma string
        if (!img || typeof img !== 'string') {
            return false;
        }

        // Verificar se não é vídeo
        return !img.includes('.mp4') &&
            !img.includes('.mov') &&
            !img.includes('.avi') &&
            !img.includes('.mkv') &&
            !img.includes('.webm');
    });

    if (imageFiles.length === 0) {
        return '<img src="https://via.placeholder.com/400x200?text=Sem+Imagem" alt="Sem imagem">';
    }

    return `<img src="${imageFiles[0]}" alt="Imagem do imóvel" onerror="this.src='https://via.placeholder.com/400x200?text=Erro+ao+Carregar'">`;
}

// Helper: obter base URL do backend (fixo)
function getBackendApiBase() {
    return 'https://buscabuscaimoveis-qa.vercel.app';
}

// Helper: enviar push de aprovação para o dono do anúncio
async function sendApprovalPushToOwner(propertyId) {
    try {
        // Tentar obter dados do anúncio já carregados em memória
        let property = (properties || []).find(p => p.id === propertyId);
        if (!property) {
            // Buscar do banco apenas o necessário
            const { data, error } = await supabase
                .from('properties')
                .select('id, user_id, title, city')
                .eq('id', propertyId)
                .single();
            if (error) throw error;
            property = data;
        }

        const backendBase = getBackendApiBase();
        if (!backendBase) {
            console.warn('Backend base URL não configurada. Pulei envio de push.');
            return;
        }

        const url = `${backendBase}/api/notifications?action=property-approved`;
        const payload = {
            userId: property.user_id,
            propertyId: property.id
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await resp.text();
        try { console.log('📬 Resposta envio push:', resp.status, JSON.parse(text)); }
        catch { console.log('📬 Resposta envio push (raw):', resp.status, text); }
    } catch (err) {
        console.error('❌ Falha ao enviar push de aprovação:', err);
    }
}

// Aprovar propriedade - USANDO SERVIÇO CENTRALIZADO
async function approveProperty(propertyId) {
    if (!confirm('Tem certeza que deseja aprovar este anúncio?')) return;

    try {
        // Usar serviço centralizado via global
        await window.ModerationService.approveProperty(propertyId);

        showSuccess('Anúncio aprovado e ativado com sucesso!');
        await loadProperties();
        applyFilters();
    } catch (error) {
        console.error('Erro ao aprovar propriedade:', error);
        showError('Erro ao aprovar anúncio. Tente novamente.');
    }
}

// Rejeitar propriedade - USANDO SERVIÇO CENTRALIZADO
async function rejectProperty(propertyId) {
    const reason = prompt('Motivo da rejeição (opcional):');

    try {
        // Usar serviço centralizado via global
        await window.ModerationService.rejectProperty(propertyId, reason);

        showSuccess('Anúncio rejeitado com sucesso!');
        await loadProperties();
        applyFilters();
    } catch (error) {
        console.error('Erro ao rejeitar propriedade:', error);
        showError('Erro ao rejeitar anúncio. Tente novamente.');
    }
}

// Ver detalhes da propriedade
function viewPropertyDetails(propertyId) {
    // Redirecionar para a página de detalhes
    window.open(`property-details.html?id=${propertyId}`, '_blank');
}

// Atualizar estatísticas
function updateStats() {
    const total = properties.length;
    const pending = properties.filter(p => p.status === 'pending').length;
    const approved = properties.filter(p => p.status === 'approved').length;
    const rejected = properties.filter(p => p.status === 'rejected').length;

    document.getElementById('total-properties').textContent = total;
    document.getElementById('pending-properties').textContent = pending;
    document.getElementById('approved-properties').textContent = approved;
    document.getElementById('rejected-properties').textContent = rejected;

    // Deixar cards clicáveis para aplicar filtros
    const totalCard = document.getElementById('total-properties').closest('.stats-card');
    const pendingCard = document.getElementById('pending-properties').closest('.stats-card');
    const approvedCard = document.getElementById('approved-properties').closest('.stats-card');
    const rejectedCard = document.getElementById('rejected-properties').closest('.stats-card');

    if (totalCard) totalCard.onclick = () => {
        statusFilter.value = '';
        applyFilters();
    };
    if (pendingCard) pendingCard.onclick = () => {
        statusFilter.value = 'pending';
        applyFilters();
    };
    if (approvedCard) approvedCard.onclick = () => {
        statusFilter.value = 'approved';
        applyFilters();
    };
    if (rejectedCard) rejectedCard.onclick = () => {
        statusFilter.value = 'rejected';
        applyFilters();
    };
}

// Funções auxiliares
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'approved': return 'status-approved';
        case 'rejected': return 'status-rejected';
        default: return 'bg-secondary';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Aguardando Aprovação';
        case 'approved': return 'Aprovado';
        case 'rejected': return 'Rejeitado';
        default: return 'Desconhecido';
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR').format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function showMainApp() {
    loadingElement.style.display = 'none';
    loginScreen.style.display = 'none';
    mainAppElement.style.display = 'block';
}

function showSuccess(message) {
    // Implementar toast ou alert
    alert(message);
}

function showError(message) {
    // Implementar toast ou alert
    alert('Erro: ' + message);
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