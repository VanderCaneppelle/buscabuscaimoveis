// Configuração do Supabase
const SUPABASE_URL = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        console.log('Carregando detalhes da propriedade:', propertyId);

        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (error) throw error;

        if (!data) {
            throw new Error('Propriedade não encontrada');
        }

        console.log('Dados da propriedade:', data);

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

        // Buscar dados do perfil (nome, telefone, CRECI)
        const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('full_name, phone, creci')
            .eq('id', property.user_id)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil:', error);
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

        // Buscar email usando função RPC
        try {
            const { data: userEmail, error: emailError } = await supabase
                .rpc('get_user_email', { user_id: property.user_id });

            if (!emailError && userEmail) {
                ownerEmailEl.textContent = userEmail;
            } else {
                console.warn('Função RPC get_user_email não encontrada ou erro:', emailError);
                ownerEmailEl.textContent = `ID: ${generateShortId(property.user_id)}`;
            }
        } catch (emailErr) {
            console.error('Erro ao buscar email via RPC:', emailErr);
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

// Aprovação/Rejeição
function setupModerationActions(propertyId) {
    const approveBtn = document.getElementById('approve-button');
    const rejectBtn = document.getElementById('reject-button');

    if (approveBtn) {
        approveBtn.addEventListener('click', async () => {
            const ok = confirm('Confirmar aprovação deste anúncio?');
            if (!ok) return;
            await updatePropertyStatus(propertyId, 'approved');
        });
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', async () => {
            const reason = prompt('Motivo da rejeição (opcional):');
            await updatePropertyStatus(propertyId, 'rejected', reason);
        });
    }
}

async function updatePropertyStatus(propertyId, newStatus, reason) {
    try {
        const updates = { status: newStatus };
        const { error } = await supabase
            .from('properties')
            .update(updates)
            .eq('id', propertyId);
        if (error) throw error;

        // Atualizar UI
        const statusInline = document.getElementById('status-display-inline');
        if (statusInline) {
            statusInline.textContent = getStatusText(newStatus);
            statusInline.className = `badge ${getStatusBadgeClass(newStatus)}`;
        }

        const statusDisplayEl = document.getElementById('status-display');
        if (statusDisplayEl) {
            statusDisplayEl.textContent = getStatusText(newStatus);
        }

        updateModerationButtonsVisibility(newStatus);
        alert(`Status atualizado para: ${getStatusText(newStatus)}`);
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        alert('Falha ao atualizar status. Tente novamente.');
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

    // Mostrar botão e configurar click handler
    viewImagesBtn.style.display = 'inline-block';
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
        // Buscar dados do usuário que publicou o anúncio
        const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', property.user_id)
            .single();

        if (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            adminName.textContent = profile?.full_name || user.email;
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