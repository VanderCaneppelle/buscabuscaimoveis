import { Alert } from 'react-native';
import { PlanService } from '../planService';

/**
 * Valida limites de mídias (imagens e vídeos) de acordo com o plano do usuário.
 * Tenta usar limites presentes no objeto de plano recebido e, em caso de ausência,
 * busca o plano completo pelo nome.
 *
 * Parâmetros aceitos (passe o que tiver disponível):
 * - imagesCount: number
 * - videosCount: number
 * - planInfo: objeto opcional no formato da CreateAdScreen (plan dentro de planInfo)
 * - userPlan: objeto opcional no formato da MyPropertiesScreen (plans dentro de userPlan)
 *
 * Retorna true se dentro dos limites, false se exceder (e mostra Alert com a mensagem).
 */
export async function validateMediaLimitsByPlan({
    imagesCount,
    videosCount,
    planInfo,
    userPlan,
}) {
    try {
        // Extrair limites e nome do plano a partir das diferentes formas usadas no app
        let maxImages = planInfo?.plan?.max_images ?? userPlan?.plans?.max_images;
        let maxVideos = planInfo?.plan?.max_videos ?? userPlan?.plans?.max_videos;

        let planName =
            planInfo?.plan?.plan_name ||
            planInfo?.plan?.name ||
            userPlan?.plans?.name ||
            userPlan?.plans?.display_name;

        // Fallback: buscar plano completo no banco se limites não estiverem disponíveis
        if ((maxImages == null || maxVideos == null) && planName) {
            const fullPlan = await PlanService.getPlanByName(planName);
            if (fullPlan) {
                maxImages = fullPlan.max_images;
                maxVideos = fullPlan.max_videos;
            }
        }

        const hasImagesLimit = typeof maxImages === 'number' && !Number.isNaN(maxImages);
        const hasVideosLimit = typeof maxVideos === 'number' && !Number.isNaN(maxVideos);

        if (hasImagesLimit && imagesCount > maxImages) {
            Alert.alert(
                'Limite de imagens excedido',
                `Seu plano permite no máximo ${maxImages} imagens por anúncio. Você adicionou ${imagesCount}. Remova ${imagesCount - maxImages} imagem(ns) para continuar.`
            );
            return false;
        }

        if (hasVideosLimit && videosCount > maxVideos) {
            Alert.alert(
                'Limite de vídeos excedido',
                `Seu plano permite no máximo ${maxVideos} vídeo(s) por anúncio. Você adicionou ${videosCount}. Remova ${videosCount - maxVideos} vídeo(s) para continuar.`
            );
            return false;
        }

        return true;
    } catch (err) {
        console.error('Erro ao validar limites do plano (shared):', err);
        // Em caso de erro de validação do plano, não bloquear o fluxo do usuário
        return true;
    }
}


