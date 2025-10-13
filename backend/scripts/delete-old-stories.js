/**
 * Job: Excluir stories inativos com mais de 48 horas
 * Executa diariamente às 12:15 via GitHub Actions
 * 
 * Responsabilidade: Excluir stories que:
 * - Estão com status 'inactive'
 * - Foram criados há mais de 48 horas (baseado no created_at)
 * 
 * Pré-requisitos:
 * - Job inactivate-old-stories.js marca stories como inativos às 00:30
 * 
 * Nota: Utiliza StoryService.deleteStory para garantir que as mídias
 * sejam excluídas do Cloudinary e Supabase Storage também.
 */

import { StoryService } from '../lib/storyService.js';

/**
 * Excluir stories inativos com mais de 48 horas
 */
async function deleteOldStories() {
    try {
        console.log('🗑️ Iniciando exclusão de stories antigos...');

        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

        console.log(`📅 Data atual: ${now.toISOString()}`);
        console.log(`📅 Data atual (local): ${now.toLocaleString('pt-BR')}`);
        console.log(`📅 Data limite (48 horas atrás): ${fortyEightHoursAgo.toISOString()}`);
        console.log(`📅 Data limite (local): ${fortyEightHoursAgo.toLocaleString('pt-BR')}`);

        // Buscar stories inativos criados há mais de 48 horas
        console.log('\n🔍 Buscando stories inativos criados há mais de 48 horas...');
        const stories = await StoryService.getInactiveStoriesOlderThan48Hours();

        console.log(`📊 Total de stories encontrados: ${stories?.length || 0}`);

        if (!stories || stories.length === 0) {
            console.log('✅ Nenhum story encontrado para excluir');
            return { 
                success: true, 
                processed: 0, 
                deleted: 0,
                message: 'Nenhum story para excluir'
            };
        }

        // Mostrar detalhes dos stories a serem excluídos
        console.log('\n📋 Stories a serem excluídos:');
        let totalMediaCount = 0;
        stories.forEach((story, index) => {
            const hoursSinceCreation = Math.floor((now - new Date(story.created_at)) / (1000 * 60 * 60));
            const mediaCount = (story.image_url ? 1 : 0) + (story.thumbnail_url ? 1 : 0);
            totalMediaCount += mediaCount;

            console.log(`${index + 1}. Story ${story.id}:`);
            console.log(`   - Título: ${story.title || '(sem título)'}`);
            console.log(`   - Criado em: ${new Date(story.created_at).toLocaleString('pt-BR')}`);
            console.log(`   - Idade: ${hoursSinceCreation}h (${Math.floor(hoursSinceCreation / 24)} dias)`);
            console.log(`   - Tipo: ${story.media_type}`);
            console.log(`   - Status: ${story.status}`);
            console.log(`   - Mídias: ${mediaCount}`);
            if (story.image_url) {
                const storage = story.image_url.includes('cloudinary.com') ? 'Cloudinary' : 'Supabase';
                console.log(`     • Image: ${storage}`);
            }
            if (story.thumbnail_url) {
                const storage = story.thumbnail_url.includes('cloudinary.com') ? 'Cloudinary' : 'Supabase';
                console.log(`     • Thumbnail: ${storage}`);
            }
        });

        console.log(`\n📸 Total de mídias a excluir: ${totalMediaCount}`);

        // Excluir stories
        console.log('\n⏳ Excluindo stories...');
        const results = [];
        let deletedCount = 0;
        let deletedMediaCount = 0;

        for (const story of stories) {
            try {
                const hoursSinceCreation = Math.floor((now - new Date(story.created_at)) / (1000 * 60 * 60));
                const mediaCount = (story.image_url ? 1 : 0) + (story.thumbnail_url ? 1 : 0);

                console.log(`\n   🗑️ Excluindo story ${story.id} (${story.title || 'sem título'})...`);
                console.log(`      - Criado há ${hoursSinceCreation}h (${Math.floor(hoursSinceCreation / 24)} dias)`);
                console.log(`      - Mídias: ${mediaCount}`);

                // Usar StoryService.deleteStory para excluir story e mídias
                await StoryService.deleteStory(story.id);

                deletedCount++;
                deletedMediaCount += mediaCount;

                console.log(`   ✅ Story ${story.id} excluído com sucesso (incluindo ${mediaCount} mídia(s))`);

                results.push({
                    storyId: story.id,
                    title: story.title,
                    created_at: story.created_at,
                    hoursSinceCreation: hoursSinceCreation,
                    mediaCount: mediaCount,
                    success: true
                });

            } catch (deleteError) {
                console.error(`   ❌ Erro ao excluir story ${story.id}:`, deleteError);
                console.error(`   Detalhes do erro:`, deleteError.message);

                results.push({
                    storyId: story.id,
                    title: story.title,
                    success: false,
                    error: deleteError.message
                });
            }
        }

        console.log('\n📊 Resumo da exclusão de stories:');
        console.log(`   - Stories processados: ${stories.length}`);
        console.log(`   - Stories excluídos: ${deletedCount}`);
        console.log(`   - Mídias excluídas: ${deletedMediaCount}`);
        console.log(`   - Sucessos: ${results.filter(r => r.success).length}`);
        console.log(`   - Erros: ${results.filter(r => !r.success).length}`);

        // Log detalhado dos resultados
        console.log('\n📋 Detalhes dos stories excluídos:');
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.storyId}: "${result.title || 'sem título'}" (criado há ${result.hoursSinceCreation}h, ${result.mediaCount} mídia(s))`);
            } else {
                console.log(`❌ ${result.storyId}: Erro - ${result.error}`);
            }
        });

        return {
            success: true,
            processed: stories.length,
            deleted: deletedCount,
            mediaDeleted: deletedMediaCount,
            results: results
        };

    } catch (error) {
        console.error('❌ Erro geral na exclusão de stories:', error);
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
    deleteOldStories()
        .then(result => {
            console.log('\n🎯 Execução finalizada:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

export { deleteOldStories };

