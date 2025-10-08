/**
 * Job 1: Marcar planos vencidos como 'expired'
 * Executa diariamente à meia-noite (00:00)
 * 
 * Responsabilidade: Apenas atualizar status das assinaturas vencidas
 */

import { supabase } from '../lib/supabase.js';

/**
 * Verificar se uma data está vencida (considerando apenas dia/mês/ano)
 */
function isPlanExpiredByDate(endDate) {
    if (!endDate) return false;

    try {
        const end = new Date(endDate);
        const now = new Date();

        // Normalizar para meia-noite (00:00:00) para comparar apenas a data
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Plano vence se a data de vencimento for anterior à data atual
        return endDateOnly < nowDateOnly;
    } catch (error) {
        console.error('Erro ao verificar expiração:', error);
        return false;
    }
}

/**
 * Marcar planos vencidos como 'expired'
 */
async function markExpiredPlans() {
    try {
        console.log('🕛 Iniciando marcação de planos vencidos...');

        const now = new Date();
        console.log(`📅 Data atual: ${now.toISOString()}`);
        console.log(`📅 Data atual (local): ${now.toLocaleString('pt-BR')}`);

        // Buscar assinaturas ativas que estão vencidas
        const { data: activeSubscriptions, error: fetchError } = await supabase
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
            .eq('status', 'active')
            .not('end_date', 'is', null);

        if (fetchError) {
            throw new Error(`Erro ao buscar assinaturas: ${fetchError.message}`);
        }

        console.log(`📊 Total de assinaturas ativas encontradas: ${activeSubscriptions?.length || 0}`);

        if (!activeSubscriptions || activeSubscriptions.length === 0) {
            console.log('✅ Nenhuma assinatura ativa encontrada');
            return { success: true, processed: 0, marked: 0 };
        }

        // Filtrar apenas as que estão vencidas pela data
        const expiredSubscriptions = activeSubscriptions.filter(sub => {
            const isExpired = isPlanExpiredByDate(sub.end_date);
            console.log(`🔍 Verificando assinatura ${sub.id} (usuário ${sub.user_id}):`, {
                end_date: sub.end_date,
                isExpired,
                plan: sub.plans?.display_name
            });
            return isExpired;
        });

        console.log(`⏰ Assinaturas vencidas encontradas: ${expiredSubscriptions.length}`);

        if (expiredSubscriptions.length === 0) {
            console.log('✅ Nenhuma assinatura vencida encontrada');
            return { success: true, processed: 0, marked: 0 };
        }

        let markedCount = 0;
        const results = [];

        // Marcar cada assinatura vencida como 'expired'
        for (const subscription of expiredSubscriptions) {
            try {
                console.log(`🔄 Marcando assinatura ${subscription.id} como vencida (usuário ${subscription.user_id})`);

                const { error: updateError } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: 'expired',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscription.id)
                    .eq('status', 'active'); // Garantir que só atualiza se ainda estiver ativa

                if (updateError) {
                    console.error(`❌ Erro ao marcar assinatura ${subscription.id}:`, updateError);
                    results.push({
                        subscriptionId: subscription.id,
                        userId: subscription.user_id,
                        success: false,
                        error: updateError.message
                    });
                    continue;
                }

                markedCount++;
                console.log(`✅ Assinatura ${subscription.id} marcada como vencida`);

                results.push({
                    subscriptionId: subscription.id,
                    userId: subscription.user_id,
                    success: true,
                    planName: subscription.plans?.display_name,
                    endDate: subscription.end_date
                });

            } catch (subscriptionError) {
                console.error(`❌ Erro ao processar assinatura ${subscription.id}:`, subscriptionError);
                results.push({
                    subscriptionId: subscription.id,
                    userId: subscription.user_id,
                    success: false,
                    error: subscriptionError.message
                });
            }
        }

        console.log('📊 Resumo da marcação de planos vencidos:');
        console.log(`   - Assinaturas processadas: ${expiredSubscriptions.length}`);
        console.log(`   - Assinaturas marcadas como vencidas: ${markedCount}`);
        console.log(`   - Sucessos: ${results.filter(r => r.success).length}`);
        console.log(`   - Erros: ${results.filter(r => !r.success).length}`);

        // Log detalhado dos resultados
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.subscriptionId} (usuário ${result.userId}): Marcada como vencida (${result.planName})`);
            } else {
                console.log(`❌ ${result.subscriptionId} (usuário ${result.userId}): Erro - ${result.error}`);
            }
        });

        return {
            success: true,
            processed: expiredSubscriptions.length,
            marked: markedCount,
            results: results
        };

    } catch (error) {
        console.error('❌ Erro geral na marcação de planos vencidos:', error);
        return {
            success: false,
            error: error.message,
            processed: 0,
            marked: 0
        };
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    markExpiredPlans()
        .then(result => {
            console.log('🎯 Marcação de planos vencidos finalizada:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

export { markExpiredPlans, isPlanExpiredByDate };
