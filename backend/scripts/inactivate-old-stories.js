/**
 * Job: Inativar stories com mais de 24 horas
 * Executa diariamente às 00:30 via GitHub Actions
 * 
 * Responsabilidade: Inativar stories que:
 * - Estão com status 'active'
 * - Foram criados há mais de 24 horas (baseado no created_at)
 * 
 * Nota: Este job apenas marca stories como inativos, não os exclui.
 * A exclusão é feita pelo job delete-old-stories.js após 48 horas.
 */

import { StoryService } from '../lib/storyService.js';

/**
 * Inativar stories com mais de 24 horas
 */
async function inactivateOldStories() {
    try {
        console.log('⏰ Iniciando inativação de stories antigos...');

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        console.log(`📅 Data atual: ${now.toISOString()}`);
        console.log(`📅 Data atual (local): ${now.toLocaleString('pt-BR')}`);
        console.log(`📅 Data limite (24 horas atrás): ${twentyFourHoursAgo.toISOString()}`);
        console.log(`📅 Data limite (local): ${twentyFourHoursAgo.toLocaleString('pt-BR')}`);

        // Buscar stories ativos criados há mais de 24 horas
        console.log('\n🔍 Buscando stories ativos criados há mais de 24 horas...');
        const stories = await StoryService.getStoriesOlderThan24Hours();

        console.log(`📊 Total de stories encontrados: ${stories?.length || 0}`);

        if (!stories || stories.length === 0) {
            console.log('✅ Nenhum story encontrado para inativar');
            return { 
                success: true, 
                processed: 0, 
                inactivated: 0,
                message: 'Nenhum story para inativar'
            };
        }

        // Mostrar detalhes dos stories a serem inativados
        console.log('\n📋 Stories a serem inativados:');
        stories.forEach((story, index) => {
            const hoursSinceCreation = Math.floor((now - new Date(story.created_at)) / (1000 * 60 * 60));
            console.log(`${index + 1}. Story ${story.id}:`);
            console.log(`   - Título: ${story.title || '(sem título)'}`);
            console.log(`   - Criado em: ${new Date(story.created_at).toLocaleString('pt-BR')}`);
            console.log(`   - Idade: ${hoursSinceCreation}h (${Math.floor(hoursSinceCreation / 24)} dias)`);
            console.log(`   - Tipo: ${story.media_type}`);
            console.log(`   - Status atual: ${story.status}`);
        });

        // Inativar stories
        console.log('\n⏳ Inativando stories...');
        const storyIds = stories.map(s => s.id);
        const result = await StoryService.inactivateMultipleStories(storyIds);

        console.log('\n📊 Resumo da inativação:');
        console.log(`   - Stories processados: ${result.total}`);
        console.log(`   - Inativados com sucesso: ${result.success}`);
        console.log(`   - Erros: ${result.errors}`);

        // Log detalhado dos resultados
        if (result.errors > 0) {
            console.log('\n❌ Stories com erro:');
            result.results
                .filter(r => !r.success)
                .forEach(r => {
                    console.log(`   - ${r.storyId}: ${r.error}`);
                });
        }

        if (result.success > 0) {
            console.log('\n✅ Stories inativados com sucesso:');
            result.results
                .filter(r => r.success)
                .forEach(r => {
                    const story = stories.find(s => s.id === r.storyId);
                    const hoursSinceCreation = Math.floor((now - new Date(story.created_at)) / (1000 * 60 * 60));
                    console.log(`   - ${r.storyId} (${story?.title || 'sem título'}) - ${hoursSinceCreation}h de idade`);
                });
        }

        return {
            success: true,
            processed: result.total,
            inactivated: result.success,
            errors: result.errors,
            results: result.results
        };

    } catch (error) {
        console.error('❌ Erro geral na inativação de stories:', error);
        return {
            success: false,
            error: error.message,
            processed: 0,
            inactivated: 0
        };
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    inactivateOldStories()
        .then(result => {
            console.log('\n🎯 Execução finalizada:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Erro fatal:', error);
            process.exit(1);
        });
}

export { inactivateOldStories };

