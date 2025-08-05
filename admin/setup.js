// Script de Configuração do Painel Administrativo
// Execute este script para configurar as credenciais do Supabase

console.log('🔧 Configuração do Painel Administrativo - BuscaBusca Imóveis');
console.log('');

// Função para obter credenciais do usuário
function setupCredentials() {
    console.log('📋 Por favor, forneça suas credenciais do Supabase:');
    console.log('');
    
    const supabaseUrl = prompt('🔗 URL do Supabase (ex: https://your-project.supabase.co):');
    const supabaseKey = prompt('🔑 Chave Anônima do Supabase:');
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Credenciais inválidas. Tente novamente.');
        return;
    }
    
    // Criar arquivo de configuração
    const configContent = `// Configuração automática do Supabase
// Gerado em: ${new Date().toISOString()}

const SUPABASE_URL = '${supabaseUrl}';
const SUPABASE_ANON_KEY = '${supabaseKey}';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Testar conexão
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Erro na conexão:', error.message);
            return false;
        }
        
        console.log('✅ Conexão com Supabase estabelecida com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao testar conexão:', error);
        return false;
    }
}

// Exportar para uso no admin.js
window.supabaseConfig = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
    client: supabase,
    testConnection
};
`;

    // Criar arquivo de configuração
    const blob = new Blob([configContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supabase-config.js';
    link.click();
    
    console.log('✅ Arquivo de configuração criado: supabase-config.js');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('1. Adicione o arquivo supabase-config.js ao seu projeto');
    console.log('2. Inclua o script no index.html antes do admin.js');
    console.log('3. Execute o script SQL no seu banco Supabase');
    console.log('4. Configure um usuário como administrador');
    console.log('');
    console.log('🔗 Para mais informações, consulte o README.md');
}

// Executar configuração
setupCredentials(); 