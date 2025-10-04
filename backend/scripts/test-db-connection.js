// Script simples para testar conexão com o banco
import { supabase } from '../lib/supabase.js';

async function testDbConnection() {
    try {
        console.log('🔍 Testando conexão com o banco...\n');

        // Teste 1: Contar total de assinaturas
        console.log('1️⃣ Contando total de assinaturas...');
        const { count, error: countError } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Erro ao contar assinaturas:', countError);
        } else {
            console.log(`✅ Total de assinaturas: ${count}`);
        }

        // Teste 2: Buscar algumas assinaturas
        console.log('\n2️⃣ Buscando algumas assinaturas...');
        const { data: subscriptions, error: selectError } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                end_date,
                status,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .limit(5);

        if (selectError) {
            console.error('❌ Erro ao buscar assinaturas:', selectError);
        } else {
            console.log(`✅ Assinaturas encontradas: ${subscriptions.length}`);
            subscriptions.forEach((sub, index) => {
                console.log(`   ${index + 1}. ID: ${sub.id}`);
                console.log(`      User: ${sub.user_id}`);
                console.log(`      Status: ${sub.status}`);
                console.log(`      End Date: ${sub.end_date}`);
                console.log(`      Plan: ${sub.plans?.display_name || 'N/A'}`);
                console.log('');
            });
        }

        // Teste 3: Buscar assinaturas ativas
        console.log('3️⃣ Buscando assinaturas ativas...');
        const { data: activeSubscriptions, error: activeError } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                end_date,
                status,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .eq('status', 'active');

        if (activeError) {
            console.error('❌ Erro ao buscar assinaturas ativas:', activeError);
        } else {
            console.log(`✅ Assinaturas ativas: ${activeSubscriptions.length}`);
            activeSubscriptions.forEach((sub, index) => {
                console.log(`   ${index + 1}. ${sub.user_id} - ${sub.plans?.display_name || 'N/A'} - ${sub.end_date}`);
            });
        }

        // Teste 4: Buscar assinaturas que vencem em 05/10
        console.log('\n4️⃣ Buscando assinaturas que vencem em 05/10...');
        const { data: oct5Subscriptions, error: oct5Error } = await supabase
            .from('user_subscriptions')
            .select(`
                id,
                user_id,
                end_date,
                status,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .like('end_date', '2025-10-05%');

        if (oct5Error) {
            console.error('❌ Erro ao buscar assinaturas de 05/10:', oct5Error);
        } else {
            console.log(`✅ Assinaturas que vencem em 05/10: ${oct5Subscriptions.length}`);
            oct5Subscriptions.forEach((sub, index) => {
                console.log(`   ${index + 1}. ${sub.user_id} - ${sub.plans?.display_name || 'N/A'} - ${sub.status} - ${sub.end_date}`);
            });
        }

        console.log('\n✅ Teste de conexão concluído!');

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

testDbConnection();
