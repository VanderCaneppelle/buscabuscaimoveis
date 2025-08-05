export default async function handler(req, res) {
    const { payment_id, preference_id, external_reference } = req.query;

    console.log('❌ Redirecionamento de falha:', { payment_id, preference_id, external_reference });

    // Redirecionar para o app com deep link
    const redirectUrl = `buscabuscaimoveis://payment/failure?payment_id=${payment_id}&preference_id=${preference_id}&external_reference=${external_reference}`;

    res.redirect(redirectUrl);
} 