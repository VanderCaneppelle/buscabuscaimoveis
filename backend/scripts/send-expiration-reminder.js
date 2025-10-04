// Script para enviar lembretes de vencimento de plano
import { NotificationService } from '../lib/notificationService.js';
import { supabase } from '../lib/supabase.js';

async function sendExpirationReminders() {
    try {
        console.log('🔄 Iniciando verificação de planos vencendo...');

        // Buscar usuários com planos vencendo em 5 dias ou menos
        const { data: expiringSubscriptions, error } = await supabase
            .from('user_subscriptions')
            .select(`
                user_id,
                end_date,
                plans (
                    id,
                    name,
                    display_name,
                    max_ads
                )
            `)
            .eq('status', 'active')
            .lte('end_date', new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()) // 5 dias
            .gte('end_date', new Date().toISOString()); // Não vencidos ainda

        if (error) {
            console.error('❌ Erro ao buscar assinaturas vencendo:', error);
            process.exit(1);
        }

        if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
            console.log('✅ Nenhum plano vencendo em breve encontrado');
            return;
        }

        console.log(`📊 Encontrados ${expiringSubscriptions.length} planos vencendo em breve`);

        const notificationService = new NotificationService();
        let sentCount = 0;
        let errorCount = 0;

        for (const subscription of expiringSubscriptions) {
            try {
                const endDate = new Date(subscription.end_date);
                const now = new Date();
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Determinar mensagem baseada nos dias restantes
                let title, body;

                if (diffDays <= 0) {
                    title = '⚠️ Plano Vencido';
                    body = `Seu plano ${subscription.plans.display_name} venceu. Renove agora para continuar usando todos os recursos.`;
                } else if (diffDays === 1) {
                    title = '🚨 Plano Vence Amanhã!';
                    body = `Seu plano ${subscription.plans.display_name} vence amanhã. Renove agora para não perder acesso.`;
                } else if (diffDays <= 3) {
                    title = '⏰ Plano Vencendo em Breve';
                    body = `Seu plano ${subscription.plans.display_name} vence em ${diffDays} dias. Renove para continuar usando todos os recursos.`;
                } else {
                    title = '📅 Lembrete de Vencimento';
                    body = `Seu plano ${subscription.plans.display_name} vence em ${diffDays} dias. Que tal renovar agora?`;
                }

                const data = {
                    type: 'plan_expiration',
                    planId: subscription.plans.id,
                    planName: subscription.plans.name,
                    daysLeft: diffDays,
                    endDate: subscription.end_date
                };

                console.log(`📤 Enviando lembrete para usuário ${subscription.user_id}:`);
                console.log(`   Plano: ${subscription.plans.display_name}`);
                console.log(`   Dias restantes: ${diffDays}`);
                console.log(`   Título: ${title}`);

                const result = await notificationService.sendNotificationToUser(
                    subscription.user_id,
                    title,
                    body,
                    data
                );

                if (result.success) {
                    sentCount++;
                    console.log(`   ✅ Enviado com sucesso (${result.sent}/${result.total} dispositivos)`);
                } else {
                    errorCount++;
                    console.log(`   ❌ Erro: ${result.error}`);
                }

                // Pequena pausa entre envios para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                errorCount++;
                console.error(`❌ Erro ao processar usuário ${subscription.user_id}:`, error);
            }
        }

        console.log('\n📊 Relatório Final:');
        console.log(`   ✅ Notificações enviadas: ${sentCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log(`   📱 Total processado: ${expiringSubscriptions.length}`);

        if (errorCount > 0) {
            console.log('⚠️ Algumas notificações falharam, mas o processo continuou');
        }

    } catch (error) {
        console.error('❌ Erro geral no script:', error);
        process.exit(1);
    }
}

sendExpirationReminders();
