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