// Script para debugar as datas e verificar a lógica
import { supabase } from '../lib/supabase.js';

async function debugDates() {
    try {
        console.log('🔍 Debugando lógica de datas...\n');

        const now = new Date();
        const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        console.log('📅 Datas calculadas:');
        console.log(`   Agora: ${now.toISOString()}`);
        console.log(`   Agora (local): ${now.toLocaleString('pt-BR')}`);
        console.log(`   5 dias: ${fiveDaysFromNow.toISOString()}`);
        console.log(`   5 dias (local): ${fiveDaysFromNow.toLocaleString('pt-BR')}\n`);

        // Buscar a assinatura específica que vence em 05/10
        console.log('🔍 Buscando assinatura que vence em 05/10...');
        const { data: specificSubscription, error: specificError } = await supabase
            .from('user_subscriptions')
            .select(`
                user_id,
                end_date,
                status,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .eq('status', 'active')
            .like('end_date', '2025-10-05%');

        if (specificError) {
            console.error('❌ Erro ao buscar assinatura específica:', specificError);
        } else if (specificSubscription && specificSubscription.length > 0) {
            console.log(`✅ Encontrada assinatura que vence em 05/10:`);
            specificSubscription.forEach((sub, index) => {
                const endDate = new Date(sub.end_date);
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`   ${index + 1}. Usuário: ${sub.user_id}`);
                console.log(`      Plano: ${sub.plans.display_name}`);
                console.log(`      Status: ${sub.status}`);
                console.log(`      end_date: ${sub.end_date}`);
                console.log(`      end_date (local): ${endDate.toLocaleString('pt-BR')}`);
                console.log(`      Dias restantes: ${diffDays}`);

                // Verificar se deveria estar incluída na query
                const shouldBeIncluded = endDate <= fiveDaysFromNow && endDate >= now;
                console.log(`      Deveria incluir? ${shouldBeIncluded ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`      Condições:`);
                console.log(`         endDate <= fiveDaysFromNow: ${endDate <= fiveDaysFromNow} (${endDate.toISOString()} <= ${fiveDaysFromNow.toISOString()})`);
                console.log(`         endDate >= now: ${endDate >= now} (${endDate.toISOString()} >= ${now.toISOString()})`);
                console.log('');
            });
        } else {
            console.log('❌ Nenhuma assinatura encontrada que vence em 05/10');
        }

        // Testar a query exata que o script usa
        console.log('🔍 Testando query exata do script...');
        const { data: queryResult, error: queryError } = await supabase
            .from('user_subscriptions')
            .select(`
                user_id,
                end_date,
                status,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .in('status', ['active', 'cancelled'])
            .lte('end_date', fiveDaysFromNow.toISOString())
            .gte('end_date', now.toISOString());

        if (queryError) {
            console.error('❌ Erro na query:', queryError);
        } else {
            console.log(`📊 Resultado da query: ${queryResult.length} assinaturas encontradas`);
            if (queryResult.length > 0) {
                queryResult.forEach((sub, index) => {
                    const endDate = new Date(sub.end_date);
                    const diffTime = endDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    console.log(`   ${index + 1}. ${sub.user_id} - ${sub.plans.display_name} - ${sub.status} - ${diffDays} dias (${endDate.toLocaleDateString('pt-BR')})`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Erro no debug:', error);
    }
}

debugDates();
