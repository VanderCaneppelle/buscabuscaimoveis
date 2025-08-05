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

        // Mostrar conteúdo
        showMainContent();

    } catch (error) {
        console.error('Erro ao carregar propriedade:', error);
        throw error;
    }
}

// Preencher dados da propriedade
function populatePropertyData(property) {
    // Header
    document.getElementById('property-title').textContent = property.title || 'Sem título';
    document.getElementById('property-location').innerHTML = `
        <i class="fas fa-map-marker-alt me-2"></i>
        ${property.neighborhood || 'N/A'}, ${property.city || 'N/A'}
    `;
    document.getElementById('property-price').textContent = formatPrice(property.price);

    // Status badge
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = getStatusText(property.status);
    statusBadge.className = `badge status-badge ${getStatusBadgeClass(property.status)}`;

    // Imagens
    setupPropertyImages(property.images);

    // Informações básicas
    document.getElementById('property-type').textContent = property.property_type || 'N/A';
    document.getElementById('transaction-type').textContent = property.transaction_type || 'N/A';
    document.getElementById('price-display').textContent = formatPrice(property.price);
    document.getElementById('status-display').textContent = getStatusText(property.status);

    // Características
    document.getElementById('bedrooms').textContent = property.bedrooms || 'N/A';
    document.getElementById('bathrooms').textContent = property.bathrooms || 'N/A';
    document.getElementById('parking-spaces').textContent = property.parking_spaces || 'N/A';
    document.getElementById('area').textContent = property.area ? `${property.area}m²` : 'N/A';

    // Localização
    document.getElementById('city').textContent = property.city || 'N/A';
    document.getElementById('neighborhood').textContent = property.neighborhood || 'N/A';
    document.getElementById('zip-code').textContent = property.zip_code || 'N/A';
    document.getElementById('created-date').textContent = formatDate(property.created_at);

    // Descrição
    if (property.description) {
        document.getElementById('description-text').textContent = property.description;
        document.getElementById('description-section').style.display = 'block';
    }

    // WhatsApp link
    setupWhatsAppLink(property);
}

// Configurar imagens da propriedade
function setupPropertyImages(images) {
    const imagesContainer = document.getElementById('property-images');
    const imageCounter = document.getElementById('image-counter');

    if (!images || images.length === 0) {
        imagesContainer.innerHTML = `
            <img src="https://via.placeholder.com/800x400?text=Sem+Imagem" alt="Sem imagem">
        `;
        return;
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
        imagesContainer.innerHTML = `
            <img src="https://via.placeholder.com/800x400?text=Sem+Imagem" alt="Sem imagem">
        `;
        return;
    }

    // Se há apenas uma imagem
    if (imageFiles.length === 1) {
        imagesContainer.innerHTML = `
            <img src="${imageFiles[0]}" alt="Imagem do imóvel" onerror="this.src='https://via.placeholder.com/800x400?text=Erro+ao+Carregar'">
        `;
        return;
    }

    // Se há múltiplas imagens, criar carrossel
    let imagesHTML = '';
    imageFiles.forEach((image, index) => {
        const activeClass = index === 0 ? 'active' : '';
        imagesHTML += `
            <div class="carousel-item ${activeClass}">
                <img src="${image}" class="d-block w-100" alt="Imagem ${index + 1}" onerror="this.src='https://via.placeholder.com/800x400?text=Erro+ao+Carregar'">
            </div>
        `;
    });

    imagesContainer.innerHTML = `
        <div id="propertyCarousel" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-inner">
                ${imagesHTML}
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#propertyCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Anterior</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#propertyCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Próximo</span>
            </button>
        </div>
        <div class="image-counter">1/${imageFiles.length}</div>
    `;

    // Atualizar contador quando o carrossel muda
    const carousel = document.getElementById('propertyCarousel');
    if (carousel) {
        carousel.addEventListener('slid.bs.carousel', function (event) {
            const currentSlide = event.to + 1;
            imageCounter.textContent = `${currentSlide}/${imageFiles.length}`;
        });
    }
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

Sou administrador do BuscaBusca Imóveis e estou analisando o anúncio "${property.title}" (ID: ${property.id}).

Para prosseguir com a aprovação, preciso de algumas informações adicionais:

1. Documentos do imóvel (matrícula, IPTU, etc.)
2. Mais fotos do imóvel (se possível)
3. Confirmação dos dados cadastrados

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

Sou administrador do BuscaBusca Imóveis e estou analisando o anúncio "${property.title}" (ID: ${property.id}).

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