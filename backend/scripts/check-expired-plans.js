/**
 * Job 2: Inativar anúncios de usuários com planos vencidos
 * Executa diariamente às 3h da manhã via GitHub Actions
 * 
 * Responsabilidade: Inativar anúncios de usuários cujos planos já foram marcados como 'expired'
 * 
 * Pré-requisito: Job 1 (mark-expired-plans.js) deve ter executado à meia-noite
 */

import { supabase } from '../lib/supabase.js';


/**
 * Inativar anúncios de usuários com planos vencidos
 */
async function deactivateExpiredAds() {
    try {
        console.log('🕒 Iniciando inativação de anúncios de planos vencidos...');

        const now = new Date();
        console.log(`📅 Data atual: ${now.toISOString()}`);
        console.log(`📅 Data atual (local): ${now.toLocaleString('pt-BR')}`);

        // Buscar usuários com planos já marcados como 'expired' (Job 1 já executou)
        const { data: expiredSubscriptions, error: expiredError } = await supabase
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
            .eq('status', 'expired')
            .not('end_date', 'is', null);

        if (expiredError) {
            throw new Error(`Erro ao buscar assinaturas: ${expiredError.message}`);
        }

        console.log(`📊 Total de assinaturas marcadas como 'expired' encontradas: ${expiredSubscriptions?.length || 0}`);

        if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
            console.log('✅ Nenhuma assinatura vencida encontrada (Job 1 não marcou nenhuma como expired)');
            return { success: true, processed: 0, deactivated: 0 };
        }

        console.log(`⏰ Planos vencidos para processar: ${expiredSubscriptions.length}`);

        let deactivatedCount = 0;
        const results = [];

        // Processar cada usuário com plano vencido
        for (const subscription of expiredSubscriptions) {
            try {
                console.log(`🔄 Processando usuário ${subscription.user_id} (plano: ${subscription.plans?.display_name})`);

                // 1. Inativar todos os anúncios do usuário
                const { data: properties, error: propertiesError } = await supabase
                    .from('properties')
                    .update({
                        ad_status: 'inactive',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', subscription.user_id)
                    .eq('ad_status', 'active')
                    .select('id, title, ad_id');

                if (propertiesError) {
                    console.error(`❌ Erro ao inativar anúncios do usuário ${subscription.user_id}:`, propertiesError);
                    results.push({
                        userId: subscription.user_id,
                        success: false,
                        error: propertiesError.message,
                        deactivatedAds: 0
                    });
                    continue;
                }

                const deactivatedAds = properties?.length || 0;
                deactivatedCount += deactivatedAds;

                console.log(`✅ Usuário ${subscription.user_id}: ${deactivatedAds} anúncios inativados`);

                // 2. Status já está como 'expired' (Job 1 já fez isso)
                console.log(`✅ Status da assinatura do usuário ${subscription.user_id} já está como 'expired' (Job 1)`)

                results.push({
                    userId: subscription.user_id,
                    success: true,
                    planName: subscription.plans?.display_name,
                    endDate: subscription.end_date,
                    deactivatedAds: deactivatedAds,
                    adIds: properties?.map(p => p.ad_id || p.id) || []
                });

            } catch (userError) {
                console.error(`❌ Erro ao processar usuário ${subscription.user_id}:`, userError);
                results.push({
                    userId: subscription.user_id,
                    success: false,
                    error: userError.message,
                    deactivatedAds: 0
                });
            }
        }

        console.log('📊 Resumo da inativação de anúncios:');
        console.log(`   - Usuários processados: ${expiredSubscriptions.length}`);
        console.log(`   - Anúncios inativados: ${deactivatedCount}`);
        console.log(`   - Sucessos: ${results.filter(r => r.success).length}`);
        console.log(`   - Erros: ${results.filter(r => !r.success).length}`);

        // Log detalhado dos resultados
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.userId}: ${result.deactivatedAds} anúncios inativados (${result.planName})`);
            } else {
                console.log(`❌ ${result.userId}: Erro - ${result.error}`);
            }
        });

        return {
            success: true,
            processed: expiredSubscriptions.length,
            deactivated: deactivatedCount,
            results: results
        };

    } catch (error) {
        console.error('❌ Erro geral na inativação de anúncios:', error);
        return {
            success: false,
            error: error.message,
            processed: 0,
            deactivated: 0
        };
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    deactivateExpiredAds()
        .then(result => {
            console.log('🎯 Execução finalizada:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

export { deactivateExpiredAds };
