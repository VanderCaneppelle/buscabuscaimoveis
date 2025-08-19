import Constants from 'expo-constants';

// Detecta se está rodando no Expo Go ou em build
const isExpoGo = Constants.appOwnership === 'expo';

// URLs de redirecionamento baseadas no ambiente
export const getRedirectUrl = (path) => {
    if (isExpoGo) {
        // Para Expo Go (desenvolvimento)
        return `exp://localhost:8081/--/${path}`;
    } else {
        // Para build (produção)
        return `buscabuscaimoveis://${path}`;
    }
};

// URLs específicas para cada funcionalidade
export const CONFIRM_EMAIL_URL = getRedirectUrl('confirm-email');
export const RESET_PASSWORD_URL = getRedirectUrl('reset-password');

// Configuração das URLs do backend
export const BACKEND_CONFIG = {
    // URL base do backend (ajuste conforme seu deploy)
    BASE_URL: 'https://buscabusca.vercel.app',

    // Endpoints específicos
    ENDPOINTS: {
        DELETE_CLOUDINARY: '/api/delete-cloudinary',
        GET_SIGNED_URL: '/api/get-signed-url',
        PAYMENTS: {
            CREATE: '/api/payments/create',
            STATUS: '/api/payments/status'
        }
    }
};

// Função para construir URLs completas
export const buildBackendUrl = (endpoint) => {
    return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
}; 