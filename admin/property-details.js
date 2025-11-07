// Configuração da API
const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL - admin.js:', API_BASE_URL);

// Estado de autenticação
let currentUser = null;
let authToken = null;

// Propriedade atual (para uso no mapa e outras funções)
let currentProperty = null;

// ✨ NOVO: Carregar token do localStorage
function loadAuthData() {
    try {
        authToken = localStorage.getItem('adminToken');
        currentUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
        
        console.log('🔍 PROPERTY-DETAILS - Token carregado:', authToken ? 'SIM' : 'NÃO');
        console.log('🔍 PROPERTY-DETAILS - Usuário carregado:', currentUser ? 'SIM' : 'NÃO');
        
        if (!authToken) {
            console.error('❌ PROPERTY-DETAILS - Token não encontrado no localStorage');
            console.error('❌ PROPERTY-DETAILS - Redirecionando para login...');
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ PROPERTY-DETAILS - Erro ao carregar dados de autenticação:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// Função para obter URL da API baseada no ambiente
function getApiBaseUrl() {
    // 🔧 DINÂMICO: Detectar ambiente baseado no hostname
    const hostname = window.location.hostname;
    console.log('🔍 PROPERTY-DETAILS - Hostname detectado:', hostname);
    
    if (hostname.includes('buscabusca-admin-qa')) {
        return 'https://buscabuscaimoveis-qa.vercel.app';
    } else if (hostname.includes('buscabusca-admin-prod')) {
        return 'https://buscabusca.vercel.app';
    } else {
        // Desenvolvimento local - detectar automaticamente
        return 'https://buscabuscaimoveis-qa.vercel.app';
    }
}

// ✨ NOVO: Usar API segura em vez de Supabase direto
console.log('🔍 PROPERTY-DETAILS - Usando API segura em vez de Supabase direto');
console.log('🔍 PROPERTY-DETAILS - API Base URL:', API_BASE_URL);

// Elementos DOM
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const mainContent = document.getElementById('main-content');
const adminName = document.getElementById('admin-name');

// Variáveis do mapa
let propertyMap = null;

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ✨ NOVO: Carregar dados de autenticação primeiro
        if (!loadAuthData()) {
            return; // Redirecionamento já foi feito
        }

        // Verificar se há um ID de propriedade na URL
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');

        if (!propertyId) {
            throw new Error('ID da propriedade não fornecido');
        }

        // Carregar detalhes da propriedade
        await loadPropertyDetails(propertyId);

        // Wire moderation buttons
        setupModerationActions(propertyId);
        
        // 🔍 DEBUG: Verificar se ModerationService está disponível
        console.log('🔍 PROPERTY-DETAILS - Verificando ModerationService após carregamento...');
        console.log('🔍 PROPERTY-DETAILS - window.ModerationService:', window.ModerationService);
        console.log('🔍 PROPERTY-DETAILS - typeof window.ModerationService:', typeof window.ModerationService);

        // Configurar nome do admin
        await setupAdminName();

    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showError(error.message);
    }
});

// Carregar detalhes da propriedade
async function loadPropertyDetails(propertyId) {
    try {
        console.log('🔍 PROPERTY-DETAILS - Carregando detalhes da propriedade:', propertyId);
        console.log('🔍 PROPERTY-DETAILS - Usando API segura:', `${API_BASE_URL}/api/admin/property-details?id=${propertyId}`);

        // ✨ NOVO: Usar API segura em vez de Supabase direto
        console.log('🔍 PROPERTY-DETAILS - Token sendo enviado:', authToken ? 'SIM' : 'NÃO');
        console.log('🔍 PROPERTY-DETAILS - Token (primeiros 20 chars):', authToken ? authToken.substring(0, 20) + '...' : 'NENHUM');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/property-details?id=${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
            throw new Error('Propriedade não encontrada');
        }

        const data = result.data;
        console.log('✅ PROPERTY-DETAILS - Dados da propriedade recebidos:', data);

        // Preencher os dados na página
        populatePropertyData(data);

        // Buscar dados do anunciante e preencher barra
        await populateOwnerData(data);

        // Carregar notas do admin
        setupAdminNotes(propertyId, data.admin_notes || '');

        // Mostrar conteúdo
        showMainContent();

    } catch (error) {
        console.error('Erro ao carregar propriedade:', error);
        throw error;
    }
}
// Buscar e preencher dados do anunciante (nome, telefone, CRECI)
async function populateOwnerData(property) {
    try {
        const ownerNameEl = document.getElementById('owner-name');
        const ownerEmailEl = document.getElementById('owner-email');
        const ownerPhoneEl = document.getElementById('owner-phone');
        const ownerCreciWrap = document.getElementById('owner-creci-wrap');
        const ownerCreciEl = document.getElementById('owner-creci');

        // ✨ NOVO: Buscar dados do perfil via API segura
        console.log('🔍 PROPERTY-DETAILS - Buscando perfil do usuário:', property.user_id);
        
        console.log('🔍 PROPERTY-DETAILS - Buscando perfil com token:', authToken ? 'SIM' : 'NÃO');
        
        const profileResponse = await fetch(`${API_BASE_URL}/api/admin/user-profile?userId=${property.user_id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        let userProfile = null;
        if (profileResponse.ok) {
            const profileResult = await profileResponse.json();
            userProfile = profileResult.data;
        }

        if (!userProfile) {
            console.error('❌ PROPERTY-DETAILS - Perfil não encontrado');
            // Fallback para dados básicos
            ownerNameEl.textContent = 'Usuário não encontrado';
            ownerEmailEl.textContent = '—';
            ownerPhoneEl.textContent = '—';
            ownerCreciWrap.style.display = 'none';
            return;
        }

        ownerNameEl.textContent = userProfile?.full_name || '—';
        ownerPhoneEl.textContent = userProfile?.phone || '—';

        if (userProfile?.creci) {
            ownerCreciEl.textContent = userProfile.creci;
            ownerCreciWrap.style.display = 'flex';
        } else {
            ownerCreciWrap.style.display = 'none';
        }

        // ✨ NOVO: Buscar email via API segura
        try {
            console.log('🔍 PROPERTY-DETAILS - Buscando email do usuário:', property.user_id);
            
            console.log('🔍 PROPERTY-DETAILS - Buscando email com token:', authToken ? 'SIM' : 'NÃO');
            
            const emailResponse = await fetch(`${API_BASE_URL}/api/admin/user-email?userId=${property.user_id}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (emailResponse.ok) {
                const emailResult = await emailResponse.json();
                if (emailResult.success && emailResult.data) {
                    ownerEmailEl.textContent = emailResult.data;
                } else {
                    ownerEmailEl.textContent = `ID: ${generateShortId(property.user_id)}`;
                }
            } else {
                console.warn('❌ PROPERTY-DETAILS - Erro ao buscar email:', emailResponse.status);
                ownerEmailEl.textContent = `ID: ${generateShortId(property.user_id)}`;
            }
        } catch (emailErr) {
            console.error('❌ PROPERTY-DETAILS - Erro ao buscar email:', emailErr);
            ownerEmailEl.textContent = `ID: ${generateShortId(property.user_id)}`;
        }

    } catch (err) {
        console.error('Erro ao carregar dados do anunciante:', err);
        // Fallback para dados básicos
        const ownerNameEl = document.getElementById('owner-name');
        const ownerEmailEl = document.getElementById('owner-email');
        const ownerPhoneEl = document.getElementById('owner-phone');
        const ownerCreciWrap = document.getElementById('owner-creci-wrap');

        ownerNameEl.textContent = 'Erro ao carregar';
        ownerEmailEl.textContent = `ID: ${generateShortId(property.user_id)}`;
        ownerPhoneEl.textContent = '—';
        ownerCreciWrap.style.display = 'none';
    }
}

// Preencher dados da propriedade
function populatePropertyData(property) {
    console.log('📋 Preenchendo dados da propriedade:', {
        id: property.id,
        title: property.title,
        address: property.address,
        neighborhood: property.neighborhood,
        city: property.city,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking_spaces: property.parking_spaces,
        area: property.area,
        images: property.images
    });
    
    // Armazenar dados da propriedade globalmente para uso no mapa
    currentProperty = property;

    // Header
    const titleEl = document.getElementById('property-title');
    const locationEl = document.getElementById('property-location');

    if (titleEl) titleEl.textContent = property.title || 'Sem título';
    if (locationEl) {
        // Tratar exibição da localização
        let locationText = '';
        if (property.neighborhood && property.neighborhood !== '-' && property.neighborhood.trim() !== '') {
            locationText = `${property.neighborhood}, ${property.city || '-'}`;
        } else {
            locationText = property.city || '-';
        }

        locationEl.innerHTML = `
        <i class="fas fa-map-marker-alt me-2"></i>
            ${locationText}
        `;
    }

    // Imagens
    setupPropertyImages(property.images);

    // Informações básicas
    const propertyTypeEl = document.getElementById('property-type');
    const transactionTypeEl = document.getElementById('transaction-type');
    const priceDisplayEl = document.getElementById('price-display');
    const statusDisplayEl = document.getElementById('status-display');

    if (propertyTypeEl) propertyTypeEl.textContent = property.property_type || '-';
    if (transactionTypeEl) transactionTypeEl.textContent = property.transaction_type || '-';
    if (priceDisplayEl) priceDisplayEl.textContent = formatPrice(property.price);
    if (statusDisplayEl) statusDisplayEl.textContent = getStatusText(property.status);

    const statusInline = document.getElementById('status-display-inline');
    if (statusInline) {
        statusInline.textContent = getStatusText(property.status);
        statusInline.className = `badge ${getStatusBadgeClass(property.status)}`;
    }

    updateModerationButtonsVisibility(property.status);

    // Características
    const bedroomsEl = document.getElementById('bedrooms');
    const bathroomsEl = document.getElementById('bathrooms');
    const parkingEl = document.getElementById('parking-spaces');
    const areaEl = document.getElementById('area');

    if (bedroomsEl) bedroomsEl.textContent = property.bedrooms || '-';
    if (bathroomsEl) bathroomsEl.textContent = property.bathrooms || '-';
    if (parkingEl) parkingEl.textContent = property.parking_spaces || '-';
    if (areaEl) areaEl.textContent = property.area ? `${property.area}m²` : '-';

    // Localização
    const cityEl = document.getElementById('city');
    const neighborhoodEl = document.getElementById('neighborhood');
    const zipCodeEl = document.getElementById('zip-code');
    const createdDateEl = document.getElementById('created-date');

    if (cityEl) cityEl.textContent = property.city || '-';
    if (neighborhoodEl) neighborhoodEl.textContent = property.neighborhood || '-';
    if (zipCodeEl) zipCodeEl.textContent = property.zip_code || '-';
    if (createdDateEl) createdDateEl.textContent = formatDate(property.created_at);

    // Descrição
    if (property.description) {
        const descriptionTextEl = document.getElementById('description-text');
        const descriptionSectionEl = document.getElementById('description-section');

        if (descriptionTextEl) descriptionTextEl.textContent = property.description;
        if (descriptionSectionEl) descriptionSectionEl.style.display = 'block';
    }

    // WhatsApp link
    setupWhatsAppLink(property);

    // Property ID (formato curto)
    const propertyIdEl = document.getElementById('property-id');
    if (propertyIdEl) propertyIdEl.textContent = generateShortId(property.id);
}

// Notas do Admin
function setupAdminNotes(propertyId, initialNotes) {
    const notesEl = document.getElementById('admin-notes');
    const saveBtn = document.getElementById('save-admin-notes');
    if (!notesEl || !saveBtn) return;

    notesEl.value = initialNotes || '';

    saveBtn.onclick = async () => {
        const notes = notesEl.value || null;
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

            const { error } = await supabase
                .from('properties')
                .update({ admin_notes: notes })
                .eq('id', propertyId);

            if (error) throw error;

            alert('Notas salvas com sucesso');
        } catch (err) {
            console.error('Erro ao salvar notas do admin:', err);
            alert('Falha ao salvar notas. Tente novamente.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salvar Notas';
        }
    };
}

// Aprovação/Rejeição - USANDO SERVIÇO CENTRALIZADO
async function setupModerationActions(propertyId) {
    // ✨ NOVO: Verificar se usuário está autenticado via localStorage
    console.log('🔍 PROPERTY-DETAILS - Verificando autenticação para moderação');
    
    if (!currentUser || !authToken) {
        console.error('❌ PROPERTY-DETAILS - Usuário não autenticado para moderação');
        return;
    }
    
    console.log('✅ PROPERTY-DETAILS - Usuário autenticado para moderação:', currentUser.name);
    
    // ✨ NOVO: Buscar status atual da propriedade
    try {
        console.log('🔍 Buscando status da propriedade:', propertyId);
        
        // ✨ NOVO: Buscar status via API segura
        const statusResponse = await fetch(`${API_BASE_URL}/api/admin/property-details?id=${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!statusResponse.ok) {
            console.error('❌ PROPERTY-DETAILS - Erro ao buscar status da propriedade:', statusResponse.status);
            return;
        }

        const statusResult = await statusResponse.json();
        if (!statusResult.success || !statusResult.data) {
            console.error('❌ PROPERTY-DETAILS - Propriedade não encontrada para status');
            return;
        }

        const property = statusResult.data;

        console.log('✅ Status atual da propriedade:', property.status);
        
        // ✨ NOVO: Mostrar/ocultar botões baseado no status
        updateModerationButtonsVisibility(property.status);
        
    } catch (error) {
        console.error('❌ Erro ao verificar status da propriedade:', error);
        console.error('❌ Stack trace:', error.stack);
    }

    const approveBtn = document.getElementById('approve-button');
    const rejectBtn = document.getElementById('reject-button');

    if (approveBtn) {
        console.log('🔍 PROPERTY-DETAILS - Configurando botão de aprovação');
        approveBtn.addEventListener('click', async () => {
            console.log('🔍 PROPERTY-DETAILS - Botão de aprovação clicado!');
            const ok = confirm('Confirmar aprovação deste anúncio?');
            if (!ok) return;

            try {
                console.log('🔍 PROPERTY-DETAILS - Chamando ModerationService.approveProperty...');
                console.log('🔍 PROPERTY-DETAILS - ModerationService disponível?', !!window.ModerationService);
                
                // Usar serviço centralizado via global
                await window.ModerationService.approveProperty(propertyId);

                // Atualizar UI local
                await updatePropertyStatusUI(propertyId, 'approved');
                alert('Anúncio aprovado e ativado com sucesso!');
            } catch (err) {
                console.error('❌ PROPERTY-DETAILS - Erro ao aprovar:', err);
                alert('Erro ao aprovar anúncio. Tente novamente.');
            }
        });
    }
    if (rejectBtn) {
        console.log('🔍 PROPERTY-DETAILS - Configurando botão de rejeição');
        rejectBtn.addEventListener('click', async () => {
            console.log('🔍 PROPERTY-DETAILS - Botão de rejeição clicado!');
            const reason = prompt('Motivo da rejeição (opcional):');

            try {
                console.log('🔍 PROPERTY-DETAILS - Chamando ModerationService.rejectProperty...');
                console.log('🔍 PROPERTY-DETAILS - ModerationService disponível?', !!window.ModerationService);
                
                // Usar serviço centralizado via global
                await window.ModerationService.rejectProperty(propertyId, reason);

                // Atualizar UI local
                await updatePropertyStatusUI(propertyId, 'rejected');
                alert('Anúncio rejeitado com sucesso!');
            } catch (err) {
                console.error('❌ PROPERTY-DETAILS - Erro ao rejeitar:', err);
                alert('Erro ao rejeitar anúncio. Tente novamente.');
            }
        });
    }
}

// ✨ NOVO: Controlar visibilidade dos botões baseado no status
function updateModerationButtonsVisibility(status) {
    const approveBtn = document.getElementById('approve-button');
    const rejectBtn = document.getElementById('reject-button');
    
    console.log('🔍 Atualizando visibilidade dos botões para status:', status);
    
    if (status === 'pending') {
        // Mostrar ambos os botões para propriedades pendentes
        if (approveBtn) approveBtn.style.display = 'inline-block';
        if (rejectBtn) rejectBtn.style.display = 'inline-block';
        console.log('✅ Mostrando botões de aprovar/rejeitar');
    } else if (status === 'approved') {
        // Ocultar botões para propriedades aprovadas
        if (approveBtn) approveBtn.style.display = 'none';
        if (rejectBtn) rejectBtn.style.display = 'none';
        console.log('✅ Ocultando botões - propriedade já aprovada');
    } else if (status === 'rejected') {
        // Ocultar botões para propriedades rejeitadas
        if (approveBtn) approveBtn.style.display = 'none';
        if (rejectBtn) rejectBtn.style.display = 'none';
        console.log('✅ Ocultando botões - propriedade já rejeitada');
    }
}

// Atualizar apenas a UI após moderação (não faz update no banco)
async function updatePropertyStatusUI(propertyId, newStatus) {
    try {
        // Atualizar badges de status na UI
        const statusInline = document.getElementById('status-display-inline');
        if (statusInline) {
            statusInline.textContent = getStatusText(newStatus);
            statusInline.className = `badge ${getStatusBadgeClass(newStatus)}`;
        }
        
        // ✨ NOVO: Atualizar visibilidade dos botões após moderação
        updateModerationButtonsVisibility(newStatus);

        const statusDisplayEl = document.getElementById('status-display');
        if (statusDisplayEl) {
            statusDisplayEl.textContent = getStatusText(newStatus);
        }

        updateModerationButtonsVisibility(newStatus);
    } catch (err) {
        console.error('Erro ao atualizar UI:', err);
    }
}

function updateModerationButtonsVisibility(status) {
    const approveBtn = document.getElementById('approve-button');
    const rejectBtn = document.getElementById('reject-button');
    if (!approveBtn || !rejectBtn) return;

    // Normalizar
    const s = (status || '').toString();
    const isPending = s === 'pending';
    const isApproved = s === 'approved';
    const isRejected = s === 'rejected';

    approveBtn.style.display = (isPending || isRejected) ? 'inline-block' : 'none';
    rejectBtn.style.display = (isPending || isApproved) ? 'inline-block' : 'none';
}

// Configurar imagens da propriedade
function setupPropertyImages(images) {
    const viewImagesBtn = document.getElementById('view-images-btn');
    const lightbox = initLightbox();

    if (!images || images.length === 0) {
        viewImagesBtn.style.display = 'none';
        return;
    }

    // Filtrar apenas imagens (excluir vídeos)
    const imageFiles = images.filter(img =>
        typeof img === 'string' &&
        !img.includes('.mp4') &&
        !img.includes('.mov') &&
        !img.includes('.avi') &&
        !img.includes('.mkv') &&
        !img.includes('.webm')
    );

    if (imageFiles.length === 0) {
        viewImagesBtn.style.display = 'none';
        return;
    }

    // Mostrar botão com contador de imagens e configurar click handler
    viewImagesBtn.style.display = 'inline-flex';
    viewImagesBtn.innerHTML = `
        <i class="fas fa-images"></i>
        Ver Todas as Fotos (${imageFiles.length})
    `;
    viewImagesBtn.onclick = () => {
        lightbox.open(imageFiles, 0);
    };
}

// Inicializa e retorna controladores do lightbox
function initLightbox() {
    const overlay = document.getElementById('lightbox');
    const imgEl = document.getElementById('lightbox-image');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const counterEl = document.getElementById('lightbox-counter');

    let sources = [];
    let current = 0;

    function update() {
        if (!sources.length) return;
        imgEl.src = sources[current];
        counterEl.textContent = `${current + 1}/${sources.length}`;
    }

    function open(newSources, startIndex = 0) {
        sources = newSources || [];
        current = Math.min(Math.max(0, startIndex), Math.max(0, sources.length - 1));
        update();
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
        document.addEventListener('keydown', onKey);
    }

    function close() {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', onKey);
    }

    function prev() {
        if (!sources.length) return;
        current = (current - 1 + sources.length) % sources.length;
        update();
    }

    function next() {
        if (!sources.length) return;
        current = (current + 1) % sources.length;
        update();
    }

    function onKey(e) {
        if (e.key === 'Escape') return close();
        if (e.key === 'ArrowLeft') return prev();
        if (e.key === 'ArrowRight') return next();
    }

    // Eventos de UI
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    return { open, close, prev, next };
}

// Configurar link do WhatsApp
async function setupWhatsAppLink(property) {
    const whatsappLink = document.getElementById('whatsapp-link');

    try {
        // ✨ NOVO: Buscar dados do usuário via API segura
        console.log('🔍 PROPERTY-DETAILS - Buscando perfil para WhatsApp:', property.user_id);
        
        let userProfile = null;
        try {
            const profileResponse = await fetch(`${API_BASE_URL}/api/admin/user-profile?userId=${property.user_id}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (profileResponse.ok) {
                const profileResult = await profileResponse.json();
                userProfile = profileResult.data;
            }
        } catch (error) {
            console.error('❌ PROPERTY-DETAILS - Erro ao buscar perfil para WhatsApp:', error);
        }

        if (!userProfile) {
            console.error('❌ PROPERTY-DETAILS - Perfil não encontrado para WhatsApp');
            // Fallback para número padrão
            setupDefaultWhatsApp(property);
            return;
        }

        if (!userProfile || !userProfile.phone) {
            console.log('Usuário não tem telefone cadastrado');
            setupDefaultWhatsApp(property);
            return;
        }

        // Formatar número do telefone
        const phoneNumber = formatPhoneNumber(userProfile.phone);

        // Mensagem personalizada para o admin
        const message = `Olá ${userProfile.full_name || 'usuário'}! 

Sou administrador do Busca Busca Imóveis e estou analisando o anúncio "${property.title}" (ID: ${property.id}).

Para prosseguir com a aprovação, preciso de algumas informações adicionais:

1. Documentos do imóvel (matrícula, IPTU, etc.)
2. Construtora responsável
3. Registro de incorporação
4. Confirmação dos dados cadastrados

Poderia me enviar essas informações?`;

        // Criar link do WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

        whatsappLink.href = whatsappUrl;

        // Atualizar texto do botão
        whatsappLink.innerHTML = `
            <i class="fab fa-whatsapp"></i>
            Solicitar Informações
        `;

        console.log('WhatsApp configurado para:', userProfile.full_name, phoneNumber);

    } catch (error) {
        console.error('Erro ao configurar WhatsApp:', error);
        setupDefaultWhatsApp(property);
    }
}

// Configurar WhatsApp padrão (fallback)
function setupDefaultWhatsApp(property) {
    const whatsappLink = document.getElementById('whatsapp-link');

    const message = `Olá! 

Sou administrador do Busca Busca Imóveis e estou analisando o anúncio "${property.title}" (ID: ${property.id}).

Para prosseguir com a aprovação, preciso de algumas informações adicionais:

1. Documentos do imóvel (matrícula, IPTU, etc.)
2. Mais fotos do imóvel (se possível)
3. Confirmação dos dados cadastrados

Poderia me enviar essas informações?`;

    // Número padrão do admin (você pode personalizar)
    const adminNumber = '5511999999999'; // Substitua pelo número do admin

    const whatsappUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
    whatsappLink.href = whatsappUrl;

    // Atualizar texto do botão
    whatsappLink.innerHTML = `
        <i class="fab fa-whatsapp"></i>
        Contato Admin
    `;
}

// Formatar número de telefone
function formatPhoneNumber(phone) {
    // Remover todos os caracteres não numéricos
    let cleanPhone = phone.replace(/\D/g, '');

    // Se não tem código do país, adicionar 55 (Brasil)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = '55' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10) {
        cleanPhone = '55' + cleanPhone;
    } else if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
    }

    return cleanPhone;
}

// Configurar nome do admin
async function setupAdminName() {
    try {
        // ✨ NOVO: Usar dados do localStorage em vez de Supabase
        console.log('🔍 PROPERTY-DETAILS - Configurando nome do admin');
        
        if (currentUser) {
            // ✨ NOVO: Usar dados do localStorage
            console.log('🔍 PROPERTY-DETAILS - Admin user encontrado:', currentUser.name);
            adminName.textContent = currentUser.name || currentUser.email || 'Administrador';
        } else {
            console.log('🔍 PROPERTY-DETAILS - Admin user não encontrado, usando padrão');
            adminName.textContent = 'Administrador';
        }
    } catch (error) {
        console.error('Erro ao configurar nome do admin:', error);
        adminName.textContent = 'Administrador';
    }
}

// Mostrar conteúdo principal
function showMainContent() {
    loadingElement.style.display = 'none';
    mainContent.style.display = 'block';
}

// Mostrar erro
function showError(message) {
    loadingElement.style.display = 'none';
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

// Funções auxiliares
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'bg-warning';
        case 'approved': return 'bg-success';
        case 'rejected': return 'bg-danger';
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
    if (!price) return 'R$ --';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

// Gerar ID curto e apresentável baseado no UUID
function generateShortId(uuid) {
    if (!uuid) return 'BB000000';

    // Remover hífens e converter para maiúsculo
    const cleanUuid = uuid.replace(/-/g, '').toUpperCase();

    // Usar os primeiros 6 caracteres alfanuméricos
    const shortPart = cleanUuid.substring(0, 6);

    // Garantir que seja alfanumérico (remover caracteres especiais se houver)
    const alphanumeric = shortPart.replace(/[^A-Z0-9]/g, '');

    // Se for menor que 6, completar com zeros
    const padded = alphanumeric.padEnd(6, '0');

    return `BB${padded}`;
}

// Funções do Mapa
function toggleMap() {
    const mapContainer = document.getElementById('property-map');
    const toggleBtn = document.getElementById('toggle-map-btn');

    if (mapContainer.style.display === 'none') {
        // Mostrar mapa
        mapContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Mapa';

        // Inicializar mapa se ainda não foi criado
        if (!propertyMap) {
            initializeMap();
        }
    } else {
        // Ocultar mapa
        mapContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-map"></i> Ver Localização no Mapa';
    }
}

function initializeMap() {
    if (!currentProperty || !currentProperty.latitude || !currentProperty.longitude) {
        console.log('Coordenadas não disponíveis para o mapa');
        return;
    }

    const mapContainer = document.getElementById('property-map');

    // Coordenadas do imóvel
    const lat = parseFloat(currentProperty.latitude);
    const lng = parseFloat(currentProperty.longitude);

    // Criar mapa
    propertyMap = L.map('property-map').setView([lat, lng], 15);

    // Adicionar camada de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(propertyMap);

    // Adicionar marcador do imóvel
    const marker = L.marker([lat, lng]).addTo(propertyMap);

    // Adicionar popup com informações do imóvel
    const popupContent = `
        <div style="text-align: center;">
            <h6 style="margin: 0 0 8px 0; color: #1e40af;">${currentProperty.title || 'Imóvel'}</h6>
            <p style="margin: 0; font-size: 0.9rem; color: #64748b;">
                ${currentProperty.neighborhood || ''}${currentProperty.neighborhood && currentProperty.city ? ', ' : ''}${currentProperty.city || ''}
            </p>
            ${currentProperty.price ? `<p style="margin: 8px 0 0 0; font-weight: bold; color: #10b981;">R$ ${formatPrice(currentProperty.price)}</p>` : ''}
        </div>
    `;

    marker.bindPopup(popupContent);

    // Ajustar zoom para mostrar o marcador adequadamente
    propertyMap.fitBounds([[lat, lng], [lat, lng]], { padding: [20, 20] });

    console.log('Mapa inicializado com sucesso');
}

function formatPrice(price) {
    if (!price) return '0';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
} 