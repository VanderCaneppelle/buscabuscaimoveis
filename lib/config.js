import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
const extra = Constants.expoConfig?.extra ?? {};

export const getRedirectUrl = (path) => {
    if (isExpoGo) {
        return `exp://localhost:8081/--/${path}`;
    }
    return `buscabuscaimoveis://${path}`;
};

const fallbackConfirmEmail = getRedirectUrl('confirm-email');

export const CONFIRM_EMAIL_URL =
    extra.EXPO_PUBLIC_CONFIRM_EMAIL_URL ||
    process.env.EXPO_PUBLIC_CONFIRM_EMAIL_URL ||
    fallbackConfirmEmail;

export const RESET_PASSWORD_URL =
  extra.EXPO_PUBLIC_RESET_PASSWORD_URL ||
  process.env.EXPO_PUBLIC_RESET_PASSWORD_URL;

export const API_BASE_URL =
  extra.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL;

export const BACKEND_CONFIG = {
    BASE_URL: API_BASE_URL,
    ENDPOINTS: {
        DELETE_CLOUDINARY: '/api/delete-cloudinary',
        GET_SIGNED_URL: '/api/get-signed-url',
        PAYMENTS: {
            CREATE: '/api/payments/create',
            STATUS: '/api/payments/status'
        }
    }
};

export const buildBackendUrl = (endpoint) => {
    return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};