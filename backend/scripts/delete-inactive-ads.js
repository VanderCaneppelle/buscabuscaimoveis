/**
 * Job 3: Excluir anúncios inativos de usuários sem plano ativo há mais de 3 dias
 * Executa diariamente às 4h da manhã via GitHub Actions
 * 
 * Responsabilidade: Excluir anúncios inativos de usuários que:
 * - Não possuem plano ativo (status: cancelled ou expired)
 * - Tiveram seus anúncios inativados há mais de 3 dias (updated_at > 3 dias)
 * 
 * Pré-requisitos: 
 * - Job 1 (mark-expired-plans.js) marca planos como expired à meia-noite
 * - Job 2 (check-expired-plans.js) inativa anúncios às 3h da manhã
 * 
 * Nota: Utiliza PropertyService.deleteProperty para garantir que as mídias
 * sejam excluídas do Cloudinary e Supabase Storage também.
 */

import { supabase } from '../lib/supabase.js';

/**
 * Importar PropertyService dinamicamente
 */
async function getPropertyService() {
    try {
        const propertyServiceModule = await import('../../lib/propertyService.js');
        return propertyServiceModule.PropertyService || propertyServiceModule.default?.PropertyService;
    } catch (error) {
        console.error('❌ Erro ao importar PropertyService:', error);
        throw error;
    }
}

/**
 * Excluir anúncios inativos de usuários sem plano ativo há mais de 3 dias
 */
async function deleteInactiveAds() {
    // Importar PropertyService dinamicamente
    const PropertyService = await getPropertyService();
    try {
        console.log('🗑️ Iniciando exclusão de anúncios inativos...');

        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        console.log(`📅 Data atual: ${now.toISOString()}`);
        console.log(`📅 Data atual (local): ${now.toLocaleString('pt-BR')}`);
        console.log(`📅 Data limite (3 dias atrás): ${threeDaysAgo.toISOString()}`);
        console.log(`📅 Data limite (local): ${threeDaysAgo.toLocaleString('pt-BR')}`);

        // 1. Buscar usuários sem plano ativo (somente cancelled ou expired)
        const { data: inactiveUsers, error: usersError } = await supabase
            .from('user_subscriptions')
            .select('user_id, status, end_date, updated_at')
            .in('status', ['cancelled', 'expired'])
            .lt('updated_at', threeDaysAgo.toISOString())
            .order('user_id');

        if (usersError) {
            throw new Error(`Erro ao buscar usuários sem plano ativo: ${usersError.message}`);
        }

        console.log(`👥 Total de usuários sem plano ativo encontrados: ${inactiveUsers?.length || 0}`);

        if (!inactiveUsers || inactiveUsers.length === 0) {
            console.log('✅ Nenhum usuário sem plano ativo encontrado');
            return { success: true, processed: 0, deleted: 0 };
        }

        // Extrair IDs únicos de usuários
        const userIds = [...new Set(inactiveUsers.map(u => u.user_id))];
        console.log(`👤 Total de usuários únicos: ${userIds.length}`);

        let deletedCount = 0;
        const results = [];

        // 2. Para cada usuário, buscar anúncios inativos há mais de 3 dias
        for (const userId of userIds) {
            try {
                console.log(`\n🔍 Processando usuário ${userId}...`);

                // Buscar anúncios inativos deste usuário que foram atualizados há mais de 3 dias
                const { data: inactiveAds, error: adsError } = await supabase
                    .from('properties')
                    .select('id, title, ad_id, ad_status, updated_at, images')
                    .eq('user_id', userId)
                    .eq('ad_status', 'inactive');

                if (adsError) {
                    console.error(`❌ Erro ao buscar anúncios do usuário ${userId}:`, adsError);
                    results.push({
                        userId: userId,
                        success: false,
                        error: adsError.message,
                        deletedAds: 0
                    });
                    continue;
                }

                if (!inactiveAds || inactiveAds.length === 0) {
                    console.log(`✅ Usuário ${userId}: Nenhum anúncio inativo há mais de 3 dias`);
                    results.push({
                        userId: userId,
                        success: true,
                        deletedAds: 0,
                        message: 'Nenhum anúncio para excluir'
                    });
                    continue;
                }

                console.log(`📋 Usuário ${userId}: ${inactiveAds.length} anúncio(s) inativo(s) há mais de 3 dias`);

                // 3. Excluir cada anúncio usando PropertyService.deleteProperty
                // Isso garante que as mídias sejam excluídas do Cloudinary e Supabase Storage
                const deletedAds = [];
                for (const ad of inactiveAds) {
                    try {
                        // Log detalhado do anúncio
                        const daysSinceUpdate = Math.floor((now - new Date(ad.updated_at)) / (1000 * 60 * 60 * 24));
                        console.log(`   🗑️ Excluindo anúncio ${ad.ad_id || ad.id} (${ad.title}) - Inativo há ${daysSinceUpdate} dias`);
                        console.log(`   📸 Mídias a excluir: ${ad.images?.length || 0}`);

                        // Usar PropertyService.deleteProperty para excluir anúncio e mídias
                        await PropertyService.deleteProperty(ad.id);

                        deletedAds.push({
                            id: ad.id,
                            ad_id: ad.ad_id,
                            title: ad.title,
                            updated_at: ad.updated_at,
                            daysSinceUpdate: daysSinceUpdate,
                            mediaCount: ad.images?.length || 0
                        });

                        console.log(`   ✅ Anúncio ${ad.ad_id || ad.id} excluído com sucesso (incluindo ${ad.images?.length || 0} mídia(s))`);

                    } catch (adError) {
                        console.error(`   ❌ Erro ao processar anúncio ${ad.ad_id || ad.id}:`, adError);
                        console.error(`   Detalhes do erro:`, adError.message);
                    }
                }

                deletedCount += deletedAds.length;

                console.log(`✅ Usuário ${userId}: ${deletedAds.length} anúncio(s) excluído(s)`);

                results.push({
                    userId: userId,
                    success: true,
                    deletedAds: deletedAds.length,
                    ads: deletedAds
                });

            } catch (userError) {
                console.error(`❌ Erro ao processar usuário ${userId}:`, userError);
                results.push({
                    userId: userId,
                    success: false,
                    error: userError.message,
                    deletedAds: 0
                });
            }
        }

        console.log('\n📊 Resumo da exclusão de anúncios inativos:');
        console.log(`   - Usuários processados: ${userIds.length}`);
        console.log(`   - Anúncios excluídos: ${deletedCount}`);
        console.log(`   - Sucessos: ${results.filter(r => r.success).length}`);
        console.log(`   - Erros: ${results.filter(r => !r.success).length}`);

        // Log detalhado dos resultados
        console.log('\n📋 Detalhes por usuário:');
        let totalMediaDeleted = 0;
        results.forEach(result => {
            if (result.success && result.deletedAds > 0) {
                console.log(`✅ ${result.userId}: ${result.deletedAds} anúncio(s) excluído(s)`);
                result.ads?.forEach(ad => {
                    totalMediaDeleted += ad.mediaCount || 0;
                    console.log(`   - ${ad.ad_id || ad.id}: "${ad.title}" (inativo há ${ad.daysSinceUpdate} dias, ${ad.mediaCount || 0} mídia(s))`);
                });
            } else if (result.success) {
                console.log(`ℹ️ ${result.userId}: ${result.message || 'Nenhum anúncio para excluir'}`);
            } else {
                console.log(`❌ ${result.userId}: Erro - ${result.error}`);
            }
        });

        console.log(`\n📸 Total de mídias excluídas: ${totalMediaDeleted}`);

        return {
            success: true,
            processed: userIds.length,
            deleted: deletedCount,
            results: results
        };

    } catch (error) {
        console.error('❌ Erro geral na exclusão de anúncios inativos:', error);
        return {
            success: false,
            error: error.message,
            processed: 0,
            deleted: 0
        };
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    deleteInactiveAds()
        .then(result => {
            console.log('\n🎯 Execução finalizada:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

export { deleteInactiveAds };

