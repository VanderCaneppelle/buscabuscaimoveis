export default async function handler(req, res) {
    console.log('🧪 TESTE - Endpoint funcionando!');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.url);
    
    return res.status(200).json({
        success: true,
        message: 'Teste funcionando!',
        timestamp: new Date().toISOString()
    });
}
