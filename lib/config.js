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
// Redefinição de senha via página web na Vercel (funciona em mobile e desktop)

const extra =
  Constants.expoConfig?.extra ??  {};

console.log('extra:', extra);


export const RESET_PASSWORD_URL =
  extra.EXPO_PUBLIC_RESET_PASSWORD_URL ||
  process.env.EXPO_PUBLIC_RESET_PASSWORD_URL;

export const API_BASE_URL =
  extra.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL;
console.log('RESET_PASSWORD_URL:', RESET_PASSWORD_URL);
console.log('API_BASE_URL:', API_BASE_URL);

// Configuração das URLs do backend
export const BACKEND_CONFIG = {
    // URL base do backend (ajuste conforme seu deploy)
    BASE_URL:API_BASE_URL,  // https://buscabusca.vercel.app

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