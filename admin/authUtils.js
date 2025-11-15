// Funções compartilhadas de autenticação para o painel admin

// Função para obter URL da API baseada no ambiente
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

const API_BASE_URL = getApiBaseUrl();

// Função para refresh do token
async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        console.log('🔄 Fazendo refresh do token...');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Token refresh failed');
        }

        // Atualizar tokens no localStorage
        const newToken = data.session.access_token;
        localStorage.setItem('adminToken', newToken);
        localStorage.setItem('adminRefreshToken', data.session.refresh_token);
        localStorage.setItem('adminTokenExpiresAt', data.session.expires_at);

        console.log('✅ Token refresh bem-sucedido');
        return newToken;
    } catch (error) {
        console.error('❌ Erro ao fazer refresh do token:', error);
        // Se o refresh falhar, fazer logout
        logoutAdmin();
        if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        } else {
            window.location.reload();
        }
        throw error;
    }
}

// Verificar se o token está expirado ou próximo de expirar
function isTokenExpired() {
    const expiresAt = localStorage.getItem('adminTokenExpiresAt');
    if (!expiresAt) return true;
    
    // Converter timestamp Unix para milissegundos
    const expiresAtMs = parseInt(expiresAt) * 1000;
    const now = Date.now();
    
    // Considerar expirado se faltar menos de 5 minutos (300000ms)
    const bufferTime = 5 * 60 * 1000; // 5 minutos
    
    return (expiresAtMs - now) < bufferTime;
}

// Função de logout
function logoutAdmin() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminTokenExpiresAt');
    localStorage.removeItem('adminUser');
    console.log('✅ Logout realizado');
}

// Função para chamadas autenticadas à API com refresh automático
async function apiCall(endpoint, options = {}) {
    // Verificar se o token está expirado ou próximo de expirar
    if (isTokenExpired()) {
        console.log('⏰ Token expirado ou próximo de expirar, fazendo refresh...');
        await refreshToken();
    }
    
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        throw new Error('No authentication token found');
    }

    let response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    // Se receber 401, tentar refresh e repetir a requisição
    if (response.status === 401) {
        console.log('🔐 Token inválido, tentando refresh...');
        const newToken = await refreshToken();
        
        // Repetir a requisição com o novo token
        response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Exportar funções para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getApiBaseUrl,
        refreshToken,
        isTokenExpired,
        logoutAdmin,
        apiCall,
        API_BASE_URL
    };
}

