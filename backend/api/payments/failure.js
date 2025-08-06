export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { payment_id, preference_id, external_reference } = req.query;

        console.log('❌ Redirecionamento de falha:', { payment_id, preference_id, external_reference });

        // Redirecionar diretamente para a PaymentConfirmationScreen
        const appUrl = 'buscabuscaimoveis://payment-confirmation';

        console.log('🔄 Redirecionando para:', appUrl);

        // Redirecionamento HTTP 302 para o deep link
        res.setHeader('Location', appUrl);
        return res.status(302).end();

    } catch (error) {
        console.error('❌ Erro no redirecionamento de falha:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 