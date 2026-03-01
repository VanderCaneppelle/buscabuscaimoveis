/**
 * Serviço de In-App Purchase para iOS
 * Usa react-native-iap - apenas para iOS (Android mantém Mercado Pago)
 */
import { Platform } from 'react-native';
import {
    initConnection,
    endConnection,
    requestPurchase,
    finishTransaction,
    purchaseUpdatedListener,
    purchaseErrorListener,
    getReceiptDataIOS,
    requestReceiptRefreshIOS,
    fetchProducts,
} from 'react-native-iap';

// Mapeamento: plan.name + period -> Product ID Apple
const PLAN_PRODUCT_IDS = {
    essential_monthly: 'com.buscabuscaimoveis.plan.essential.monthly',
    essential_annual: 'com.buscabuscaimoveis.plan.essential.annual',
    bronze_monthly: 'com.buscabuscaimoveis.plan.bronze.monthly',
    bronze_annual: 'com.buscabuscaimoveis.plan.bronze.annual',
    silver_monthly: 'com.buscabuscaimoveis.plan.silver.monthly',
    silver_annual: 'com.buscabuscaimoveis.plan.silver.annual',
    gold_monthly: 'com.buscabuscaimoveis.plan.gold.monthly',
    gold_annual: 'com.buscabuscaimoveis.plan.gold.annual',
};

// Mapeamento: duration_days ou boostPlan.name -> Product ID Apple
const BOOST_PRODUCT_IDS = {
    1: 'com.buscabuscaimoveis.boost.oneday',
    3: 'com.buscabuscaimoveis.boost.threedays',
    5: 'com.buscabuscaimoveis.boost.fivedays',
    7: 'com.buscabuscaimoveis.boost.seven.days',
    boost_1_day: 'com.buscabuscaimoveis.boost.oneday',
    boost_3_days: 'com.buscabuscaimoveis.boost.threedays',
    boost_5_days: 'com.buscabuscaimoveis.boost.fivedays',
    boost_7_days: 'com.buscabuscaimoveis.boost.seven.days',
};

let purchaseSubscription = null;
let errorSubscription = null;

/**
 * Retorna o Product ID Apple para um plano
 * @param {Object} plan - plano do Supabase (name, period). name pode ser "bronze" ou "bronze_annual"
 * @returns {string} Product ID
 */
export function getAppleProductIdForPlan(plan) {
    if (!plan) return null;
    const baseName = (plan.name || '').replace('_annual', '');
    const key = plan.period === 'annual' ? `${baseName}_annual` : `${baseName}_monthly`;
    return PLAN_PRODUCT_IDS[key] || `com.buscabuscaimoveis.plan.${baseName}.${plan.period === 'annual' ? 'annual' : 'monthly'}`;
}

/**
 * Retorna o Product ID Apple para um boost
 * @param {Object} boostPlan - boostPlan (name, duration_days)
 * @returns {string} Product ID
 */
export function getAppleProductIdForBoost(boostPlan) {
    if (!boostPlan) return null;
    return BOOST_PRODUCT_IDS[boostPlan.duration_days] || BOOST_PRODUCT_IDS[boostPlan.name] || null;
}

/**
 * Inicializa a conexão com a App Store (apenas iOS)
 */
export async function initIAP() {
    if (Platform.OS !== 'ios') return false;
    try {
        const connected = await initConnection();
        console.log('🍎 IAP initConnection:', connected);
        return connected;
    } catch (error) {
        console.warn('🍎 IAP initConnection error:', error?.message);
        return false;
    }
}

/**
 * Encerra a conexão (chamar ao desmontar)
 */
export async function endIAP() {
    if (Platform.OS !== 'ios') return;
    removePurchaseListeners();
    try {
        await endConnection();
    } catch (e) {
        // ignore
    }
}

function removePurchaseListeners() {
    if (purchaseSubscription?.remove) purchaseSubscription.remove();
    if (errorSubscription?.remove) errorSubscription.remove();
    purchaseSubscription = null;
    errorSubscription = null;
}

/**
 * Inicia a compra de um produto (iOS)
 * @param {string} productId - Product ID Apple
 * @returns {Promise<{success: boolean, purchase?: object, error?: string}>}
 */
export function purchaseProduct(productId) {
    return new Promise((resolve) => {
        if (Platform.OS !== 'ios') {
            resolve({ success: false, error: 'IAP disponível apenas no iOS' });
            return;
        }

        removePurchaseListeners();

        purchaseSubscription = purchaseUpdatedListener(async (purchase) => {
            try {
                removePurchaseListeners();
                console.log('🍎 Compra concluída:', purchase?.productId, purchase?.transactionId);
                resolve({ success: true, purchase });
            } catch (e) {
                resolve({ success: false, error: e?.message });
            }
        });

        errorSubscription = purchaseErrorListener((error) => {
            removePurchaseListeners();
            console.log('🍎 Erro na compra:', error?.message);
            if (error?.code === 'E_USER_CANCELLED') {
                resolve({ success: false, cancelled: true });
            } else {
                resolve({ success: false, error: error?.message || 'Erro na compra' });
            }
        });

        requestPurchase({
            request: {
                apple: { sku: productId },
            },
            type: 'in-app',
        }).catch((err) => {
            removePurchaseListeners();
            resolve({ success: false, error: err?.message });
        });
    });
}

/**
 * Finaliza a transação (consumable)
 */
export async function finishPurchase(purchase) {
    if (Platform.OS !== 'ios' || !purchase) return;
    try {
        await finishTransaction({
            purchase,
            isConsumable: true,
        });
    } catch (e) {
        console.warn('🍎 finishTransaction:', e?.message);
    }
}

/**
 * Obtém o receipt em base64 para envio ao backend
 */
export async function getReceipt() {
    if (Platform.OS !== 'ios') return null;
    try {
        // Tentar refresh primeiro para garantir receipt atualizado
        await requestReceiptRefreshIOS();
    } catch (e) {
        // Pode falhar se não houver nada para refresh
    }
    try {
        return await getReceiptDataIOS();
    } catch (e) {
        console.warn('🍎 getReceiptDataIOS:', e?.message);
        return null;
    }
}

/**
 * Busca produtos (opcional, para validar antes de comprar)
 */
export async function getProducts(productIds) {
    if (Platform.OS !== 'ios' || !productIds?.length) return [];
    try {
        const products = await fetchProducts({
            skus: productIds,
            type: 'in-app',
        });
        return products?.products || [];
    } catch (e) {
        console.warn('🍎 fetchProducts:', e?.message);
        return [];
    }
}
