console.log('🚀 Admin.js carregado!');

// Configuração do Supabase
const SUPABASE_URL = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';


// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado da aplicação
let properties = [];
let filteredProperties = [];
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
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📊 Sessão encontrada:', !!session);

        if (session) {
            console.log('👤 Usuário já logado:', session.user.email);
            // Verificar se o usuário é admin
            const isUserAdmin = await checkIfUserIsAdmin(session.user.id);
            if (isUserAdmin) {
                await initializeAdminPanel(session.user);
            } else {
                showLoginScreen('Usuário não tem permissões de administrador');
            }
        } else {
            console.log('🔐 Nenhuma sessão encontrada, mostrando tela de login');
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showLoginScreen('Erro ao verificar autenticação');
    }
});

// Verificar se usuário é admin
async function checkIfUserIsAdmin(userId) {
    try {
        console.log('🔍 Verificando admin para userId:', userId);

        const { data, error } = await supabase
            .from('profiles')
            .select('is_admin, full_name')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ Erro na consulta admin:', error);
            throw error;
        }

        console.log('📊 Dados do perfil:', data);
        const isAdmin = data?.is_admin || false;
        console.log('👑 is_admin value:', isAdmin);

        return isAdmin;
    } catch (error) {
        console.error('❌ Erro ao verificar se usuário é admin:', error);
        return false;
    }
}

// Inicializar painel admin
async function initializeAdminPanel(user) {
    try {
        console.log('📊 Carregando propriedades...');
        await loadProperties();

        console.log('🎯 Configurando event listeners...');
        setupEventListeners();

        console.log('📈 Atualizando estatísticas...');
        updateStats();

        console.log('🖥️ Mostrando painel principal...');
        showMainApp();

        // Atualizar nome do admin (email vem do user do Supabase)
        console.log('👤 Atualizando nome do admin...');
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        // user.email vem do Supabase auth, não da tabela profiles
        adminName.textContent = profile?.full_name || user.email;
        console.log('✅ Painel admin inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar painel:', error);
        showError('Erro ao carregar dados. Verifique a conexão.');
    }
}

// Carregar propriedades
async function loadProperties() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        properties = data || [];
        filteredProperties = [...properties];
        renderProperties();
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        throw error;
    }
}

// Configurar event listeners
function setupEventListeners() {
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
    applyFiltersBtn.addEventListener('click', applyFilters);

    // Filtros em tempo real
    statusFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    cityFilter.addEventListener('input', debounce(applyFilters, 300));
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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Login bem-sucedido para usuário:', data.user.id);

        // Verificar se é admin
        console.log('🔍 Verificando se usuário é admin...');
        const isUserAdmin = await checkIfUserIsAdmin(data.user.id);
        console.log('👤 Usuário é admin?', isUserAdmin);

        if (isUserAdmin) {
            console.log('🚀 Inicializando painel admin...');
            await initializeAdminPanel(data.user);
        } else {
            console.log('❌ Usuário não é admin');
            showLoginError('Usuário não tem permissões de administrador');
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showLoginError('Email ou senha incorretos');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await supabase.auth.signOut();
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

// Aplicar filtros
function applyFilters() {
    const status = statusFilter.value;
    const propertyType = typeFilter.value;
    const city = cityFilter.value.toLowerCase();

    filteredProperties = properties.filter(property => {
        const matchesStatus = !status || property.status === status;
        const matchesType = !propertyType || property.property_type === propertyType;
        const matchesCity = !city || property.city.toLowerCase().includes(city);

        return matchesStatus && matchesType && matchesCity;
    });

    renderProperties();
    updateStats();
}

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
        <div class="property-card">
            <div class="row">
                <div class="col-md-4">
                    <div class="property-images">
                        ${renderPropertyImages(property.images)}
                        ${property.images && property.images.length > 1 ?
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
}

// Renderizar imagens da propriedade
function renderPropertyImages(images) {
    if (!images || images.length === 0) {
        return '<img src="https://via.placeholder.com/400x200?text=Sem+Imagem" alt="Sem imagem">';
    }

    // Filtrar apenas imagens (excluir vídeos)
    const imageFiles = images.filter(img =>
        !img.includes('.mp4') &&
        !img.includes('.mov') &&
        !img.includes('.avi') &&
        !img.includes('.mkv') &&
        !img.includes('.webm')
    );

    if (imageFiles.length === 0) {
        return '<img src="https://via.placeholder.com/400x200?text=Sem+Imagem" alt="Sem imagem">';
    }

    return `<img src="${imageFiles[0]}" alt="Imagem do imóvel" onerror="this.src='https://via.placeholder.com/400x200?text=Erro+ao+Carregar'">`;
}

// Aprovar propriedade
async function approveProperty(propertyId) {
    if (!confirm('Tem certeza que deseja aprovar este anúncio?')) return;

    try {
        // Obter o usuário logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { error } = await supabase
            .from('properties')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user.id // Usar o ID real do usuário logado
            })
            .eq('id', propertyId);

        if (error) throw error;

        showSuccess('Anúncio aprovado com sucesso!');
        await loadProperties();
        applyFilters();
    } catch (error) {
        console.error('Erro ao aprovar propriedade:', error);
        showError('Erro ao aprovar anúncio. Tente novamente.');
    }
}

// Rejeitar propriedade
async function rejectProperty(propertyId) {
    const reason = prompt('Motivo da rejeição (opcional):');

    try {
        // Obter o usuário logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { error } = await supabase
            .from('properties')
            .update({
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: user.id, // Usar o ID real do usuário logado
                rejection_reason: reason || null
            })
            .eq('id', propertyId);

        if (error) throw error;

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