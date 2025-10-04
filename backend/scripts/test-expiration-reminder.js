// Script de teste para verificar lembretes de vencimento
import { supabase } from '../lib/supabase.js';

async function testExpirationReminder() {
    try {
        console.log('🧪 Testando sistema de lembretes de vencimento...\n');

        // 1. Verificar assinaturas ativas
        console.log('1️⃣ Verificando assinaturas ativas...');
        const { data: activeSubscriptions, error: activeError } = await supabase
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
            .eq('status', 'active');

        if (activeError) {
            console.error('❌ Erro ao buscar assinaturas ativas:', activeError);
            return;
        }

        console.log(`   📊 Total de assinaturas ativas: ${activeSubscriptions.length}`);

        // 2. Verificar assinaturas vencendo em 5 dias
        console.log('\n2️⃣ Verificando assinaturas vencendo em 5 dias...');
        const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        const { data: expiringSubscriptions, error: expiringError } = await supabase
            .from('user_subscriptions')
            .select(`
                user_id,
                end_date,
                plans (
                    id,
                    name,
                    display_name
                )
            `)
            .eq('status', 'active')
            .lte('end_date', fiveDaysFromNow)
            .gte('end_date', now);

        if (expiringError) {
            console.error('❌ Erro ao buscar assinaturas vencendo:', expiringError);
            return;
        }

        console.log(`   📊 Assinaturas vencendo em 5 dias: ${expiringSubscriptions.length}`);

        // 3. Mostrar detalhes das assinaturas vencendo
        if (expiringSubscriptions.length > 0) {
            console.log('\n3️⃣ Detalhes das assinaturas vencendo:');
            expiringSubscriptions.forEach((subscription, index) => {
                const endDate = new Date(subscription.end_date);
                const diffTime = endDate.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`   ${index + 1}. Usuário: ${subscription.user_id}`);
                console.log(`      Plano: ${subscription.plans.display_name}`);
                console.log(`      Vence em: ${diffDays} dias (${endDate.toLocaleDateString('pt-BR')})`);
                console.log('');
            });
        } else {
            console.log('   ✅ Nenhuma assinatura vencendo em breve');
        }

        // 4. Verificar tokens de notificação
        console.log('4️⃣ Verificando tokens de notificação...');
        const { data: tokens, error: tokensError } = await supabase
            .from('device_tokens')
            .select('user_id, is_active')
            .eq('is_active', true);

        if (tokensError) {
            console.error('❌ Erro ao buscar tokens:', tokensError);
            return;
        }

        console.log(`   📊 Total de tokens ativos: ${tokens.length}`);

        // 5. Verificar usuários com tokens que têm planos vencendo
        if (expiringSubscriptions.length > 0 && tokens.length > 0) {
            console.log('\n5️⃣ Usuários com planos vencendo que têm tokens:');
            const userIdsWithTokens = new Set(tokens.map(t => t.user_id));
            const expiringUsersWithTokens = expiringSubscriptions.filter(s =>
                userIdsWithTokens.has(s.user_id)
            );

            console.log(`   📊 Usuários que receberiam notificação: ${expiringUsersWithTokens.length}`);

            expiringUsersWithTokens.forEach((subscription, index) => {
                const endDate = new Date(subscription.end_date);
                const diffTime = endDate.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`   ${index + 1}. ${subscription.user_id} - ${subscription.plans.display_name} (${diffDays} dias)`);
            });
        }

        console.log('\n✅ Teste concluído com sucesso!');
        console.log('\n📋 Resumo:');
        console.log(`   • Assinaturas ativas: ${activeSubscriptions.length}`);
        console.log(`   • Vencendo em 5 dias: ${expiringSubscriptions.length}`);
        console.log(`   • Tokens ativos: ${tokens.length}`);

        if (expiringSubscriptions.length > 0) {
            console.log('\n🚀 Para testar o envio real, execute:');
            console.log('   node scripts/send-expiration-reminder.js');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testExpirationReminder();
