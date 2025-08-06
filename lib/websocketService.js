import { supabase } from './supabase';

export const WebSocketService = {
    subscription: null,
    currentPaymentId: null,

    // Conectar ao canal de pagamentos
    subscribeToPaymentUpdates: (paymentId, callback) => {
        console.log('🔌 Conectando ao canal de pagamentos:', paymentId);

        // Se já estiver conectado ao mesmo pagamento, não reconectar
        if (WebSocketService.subscription && WebSocketService.currentPaymentId === paymentId) {
            console.log('🔌 Já conectado ao mesmo pagamento, mantendo conexão');
            return WebSocketService.subscription;
        }

        // Se estiver conectado a outro pagamento, desconectar primeiro
        if (WebSocketService.subscription) {
            console.log('🔌 Desconectando pagamento anterior:', WebSocketService.currentPaymentId);
            WebSocketService.unsubscribe();
        }

        // Inscrever no canal de pagamentos do Supabase
        const subscription = supabase
            .channel(`payment_${paymentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payments',
                    filter: `id=eq.${paymentId}`,
                },
                (payload) => {
                    console.log('📡 WebSocket: Pagamento atualizado:', payload);
                    console.log('📡 Payload completo:', JSON.stringify(payload, null, 2));
                    callback(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('🔌 Status da conexão WebSocket:', status);
            });

        WebSocketService.subscription = subscription;
        WebSocketService.currentPaymentId = paymentId;
        return subscription;
    },

    // Desconectar do canal
    unsubscribe: () => {
        if (WebSocketService.subscription) {
            console.log('🔌 Desconectando do canal de pagamentos:', WebSocketService.currentPaymentId);
            supabase.removeChannel(WebSocketService.subscription);
            WebSocketService.subscription = null;
            WebSocketService.currentPaymentId = null;
        }
    },

    // Verificar se está conectado
    isConnected: () => {
        return WebSocketService.subscription !== null;
    },

    // Verificar se está conectado ao pagamento específico
    isConnectedToPayment: (paymentId) => {
        return WebSocketService.subscription !== null && WebSocketService.currentPaymentId === paymentId;
    },
}; 