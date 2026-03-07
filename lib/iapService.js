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

/** Todos os Product IDs usados no app (para teste de conexão) */
const ALL_PRODUCT_IDS = [
    ...Object.values(PLAN_PRODUCT_IDS),
    ...Object.values(BOOST_PRODUCT_IDS),
].filter((v, i, a) => a.indexOf(v) === i);

let purchaseSubscription = null;
let errorSubscription = null;

/**
 * Retorna o Product ID Apple para um plano
 * @param {Object} plan - plano do Supabase (name, period). name pode ser "bronze" ou "bronze_annual"
 * @returns {string} Product ID
 */
export function getAppleProductIdForPlan(plan) {
    if (!plan) {
        console.log('🍎 [IAP] getAppleProductIdForPlan: plan é null');
        return null;
    }
    const baseName = (plan.name || '').replace('_annual', '');
    const key = plan.period === 'annual' ? `${baseName}_annual` : `${baseName}_monthly`;
    const productId = PLAN_PRODUCT_IDS[key] || `com.buscabuscaimoveis.plan.${baseName}.${plan.period === 'annual' ? 'annual' : 'monthly'}`;
    console.log('🍎 [IAP] getAppleProductIdForPlan:', { planName: plan.name, period: plan.period, key, productId });
    return productId;
}

/**
 * Retorna o Product ID Apple para um boost
 * @param {Object} boostPlan - boostPlan (name, duration_days)
 * @returns {string} Product ID
 */
export function getAppleProductIdForBoost(boostPlan) {
    if (!boostPlan) {
        console.log('🍎 [IAP] getAppleProductIdForBoost: boostPlan é null');
        return null;
    }
    const productId = BOOST_PRODUCT_IDS[boostPlan.duration_days] || BOOST_PRODUCT_IDS[boostPlan.name] || null;
    console.log('🍎 [IAP] getAppleProductIdForBoost:', { name: boostPlan.name, duration_days: boostPlan.duration_days, productId });
    return productId;
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

        console.log('🍎 [IAP] Iniciando compra, productId:', productId);

        purchaseSubscription = purchaseUpdatedListener(async (purchase) => {
            try {
                removePurchaseListeners();
                console.log('🍎 [IAP] Compra concluída:', { productId: purchase?.productId, transactionId: purchase?.transactionId });
                resolve({ success: true, purchase });
            } catch (e) {
                resolve({ success: false, error: e?.message });
            }
        });

        errorSubscription = purchaseErrorListener((error) => {
            removePurchaseListeners();
            console.log('🍎 [IAP] Erro na compra:', { message: error?.message, code: error?.code, productId });
            if (error?.code === 'E_USER_CANCELLED') {
                resolve({ success: false, cancelled: true });
            } else {
                resolve({ success: false, error: error?.message || 'Erro na compra' });
            }
        });

        requestPurchase({
            request: {
                ios: { sku: productId },
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
 * Testa a conexão com a App Store: initConnection + fetchProducts.
 * Útil para debug no TestFlight quando não há logs.
 * @returns {Promise<{success: boolean, initOk: boolean, productsCount: number, productIds: string[], error?: string}>}
 */
export async function testIAPConnection() {
    if (Platform.OS !== 'ios') {
        return { success: false, initOk: false, productsCount: 0, productIds: [], error: 'IAP apenas no iOS' };
    }
    try {
        const initOk = await initConnection();
        if (!initOk) {
            return { success: false, initOk: false, productsCount: 0, productIds: [], error: 'initConnection retornou false' };
        }
        const result = await fetchProducts({
            skus: ALL_PRODUCT_IDS,
            type: 'in-app',
        });
        const list = Array.isArray(result) ? result : (result?.products || []);
        const productIds = list.map(p => p?.productId || p?.id || '').filter(Boolean);
        return {
            success: productIds.length > 0,
            initOk: true,
            productsCount: productIds.length,
            productIds,
            error: productIds.length === 0 ? 'Apple retornou 0 produtos. Verifique conta Sandbox (Settings > Developer) e Product IDs no App Store Connect.' : undefined,
        };
    } catch (e) {
        return {
            success: false,
            initOk: false,
            productsCount: 0,
            productIds: [],
            error: e?.message || String(e),
        };
    }
}

/**
 * Busca produtos (opcional, para validar antes de comprar)
 */
export async function getProducts(productIds) {
    if (Platform.OS !== 'ios' || !productIds?.length) return [];
    try {
        console.log('🍎 [IAP] fetchProducts, skus:', productIds);
        const result = await fetchProducts({
            skus: productIds,
            type: 'in-app',
        });
        const list = Array.isArray(result) ? result : (result?.products || []);
        console.log('🍎 [IAP] fetchProducts retornou:', list.length, 'produtos', list.map(p => p?.id || p?.productId));
        return list;
    } catch (e) {
        console.warn('🍎 [IAP] fetchProducts erro:', e?.message);
        return [];
    }
}
