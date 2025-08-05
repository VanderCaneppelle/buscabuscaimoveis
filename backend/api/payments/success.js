export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('🎉 Redirecionamento de sucesso recebido');

        // Redirecionar para o app com deep link
        const appUrl = 'buscabuscaimoveis://payment-success';

        // HTML que redireciona automaticamente para o app
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Pagamento Aprovado - BuscaBusca Imóveis</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    color: white;
                }
                .container {
                    text-align: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 400px;
                }
                .success-icon {
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                h1 {
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                p {
                    margin: 0 0 30px 0;
                    opacity: 0.9;
                    line-height: 1.5;
                }
                .button {
                    background: #4CAF50;
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: background 0.3s;
                }
                .button:hover {
                    background: #45a049;
                }
                .loading {
                    margin-top: 20px;
                    font-size: 14px;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">🎉</div>
                <h1>Pagamento Aprovado!</h1>
                <p>Seu plano foi ativado com sucesso. Você será redirecionado automaticamente para o app.</p>
                
                <a href="${appUrl}" class="button" id="openApp">
                    Abrir App
                </a>
                
                <div class="loading" id="loading">
                    Redirecionando automaticamente...
                </div>
            </div>

            <script>
                // Tentar abrir o app automaticamente
                setTimeout(() => {
                    window.location.href = '${appUrl}';
                }, 1000);

                // Se não conseguir abrir o app, mostrar mensagem
                setTimeout(() => {
                    document.getElementById('loading').innerHTML = 
                        'Se o app não abriu automaticamente, clique no botão acima.';
                }, 3000);
            </script>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('❌ Erro no redirecionamento de sucesso:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 