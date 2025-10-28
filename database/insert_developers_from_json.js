/**
 * Script para inserir construtoras do arquivo construtoras_extraidas.json
 * no banco de dados Supabase
 * 
 * Uso:
 * 1. Certifique-se de ter executado create_developers_table.sql primeiro
 * 2. Configure as credenciais do Supabase
 * 3. Execute: node database/insert_developers_from_json.js
 */

const fs = require('fs');
const path = require('path');

// Configuração do Supabase - SUBSTITUA PELOS VALORES CORRETOS
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ftglfnmyxtnygrmkxwos.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0Z2xmbm15eHRueWdybWt4d29zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0MTQwMiwiZXhwIjoyMDc2ODE3NDAyfQ.1pqhs6OF7NVHashivSciSsePW05mHqqa9imJasfZs8I';

// Verificar se as credenciais estão configuradas
if (SUPABASE_URL === 'SUA_URL_AQUI' || SUPABASE_SERVICE_KEY === 'SUA_SERVICE_KEY_AQUI') {
    console.error('❌ ERRO: Configure as variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY');
    console.log('\nVocê pode:');
    console.log('1. Definir variáveis de ambiente:');
    console.log('   export SUPABASE_URL="sua-url"');
    console.log('   export SUPABASE_SERVICE_KEY="sua-service-key"');
    console.log('');
    console.log('2. Ou editar este arquivo e substituir os valores diretamente');
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function insertDevelopers() {
    try {
        // Ler o arquivo JSON
        const jsonPath = path.join(__dirname, '..', 'construtoras_extraidas.json');
        console.log('📂 Lendo arquivo:', jsonPath);
        
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`✅ ${data.length} construtoras encontradas no arquivo\n`);

        // Preparar dados para inserção
        const developersToInsert = data
            .filter(item => item.reDeveloperName) // Apenas registros com nome
            .map(item => ({
                name: item.reDeveloperName.trim(),
                name_composition: item.reDeveloperNameComposition?.trim() || null,
                city_name: item.cityName?.trim() || null,
                city_uf: item.cityUf?.trim() || null,
                is_active: true,
                is_verified: false // Importados do JSON não são verificados por padrão
            }));

        console.log(`📊 ${developersToInsert.length} construtoras serão inseridas\n`);

        // Inserir em lotes para evitar timeout
        const BATCH_SIZE = 100;
        let inserted = 0;
        let duplicates = 0;
        let errors = 0;

        for (let i = 0; i < developersToInsert.length; i += BATCH_SIZE) {
            const batch = developersToInsert.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(developersToInsert.length / BATCH_SIZE);
            
            console.log(`🔄 Processando lote ${batchNumber}/${totalBatches} (${batch.length} registros)...`);

            const { data: result, error } = await supabase
                .from('developers')
                .upsert(batch, { 
                    onConflict: 'name,name_composition,city_name,city_uf',
                    ignoreDuplicates: false 
                })
                .select();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    duplicates += batch.length;
                    console.log(`   ⚠️  Duplicados ignorados: ${batch.length}`);
                } else {
                    errors += batch.length;
                    console.error(`   ❌ Erro no lote:`, error.message);
                }
            } else {
                inserted += result?.length || batch.length;
                console.log(`   ✅ Inseridos: ${result?.length || batch.length}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📈 RESUMO DA IMPORTAÇÃO');
        console.log('='.repeat(50));
        console.log(`✅ Inseridos com sucesso: ${inserted}`);
        console.log(`⚠️  Duplicados (ignorados): ${duplicates}`);
        console.log(`❌ Erros: ${errors}`);
        console.log(`📊 Total processado: ${developersToInsert.length}`);
        console.log('='.repeat(50));

        // Buscar estatísticas da tabela
        const { count, error: countError } = await supabase
            .from('developers')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`\n💾 Total de construtoras no banco: ${count}`);
        }

        console.log('\n✨ Importação concluída!');

    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
        process.exit(1);
    }
}

// Executar
insertDevelopers();

