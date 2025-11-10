import '../env.js';
import fetch from 'node-fetch';
import { supabase } from '../../lib/supabase.js';

const BUNNY_WEBHOOK_KEY = process.env.BUNNY_STREAM_WEBHOOK_KEY;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID;
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || process.env.EXPO_PUBLIC_BUNNY_API_KEY;
const BUNNY_STREAM_HOST = process.env.BUNNY_STREAM_HOST || process.env.EXPO_PUBLIC_BUNNY_STREAM_HOST;

async function updateStoryStatus(videoId, statusPayload, extraFields = {}) {
    const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('bunny_video_id', videoId)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ [BunnyWebhook] Erro ao buscar story:', videoId, error);
        return null;
    }

    if (!data) {
        console.warn('⚠️ [BunnyWebhook] Nenhum story encontrado para videoId:', videoId);
        return null;
    }

    const storyId = data.id;

    const updatePayload = {
        status: 'active',
        updated_at: new Date().toISOString(),
        encoding_metadata: statusPayload || null
    };

    if (extraFields && typeof extraFields === 'object') {
        Object.entries(extraFields).forEach(([key, value]) => {
            if (value !== undefined) {
                updatePayload[key] = value;
            }
        });
    }

    const { error: updateError } = await supabase
        .from('stories')
        .update(updatePayload)
        .eq('id', storyId);

    if (updateError) {
        console.error('❌ [BunnyWebhook] Erro ao atualizar story:', storyId, updateError);
        return null;
    }

    console.log('✅ [BunnyWebhook] Story ativado:', storyId);
    return { storyId, status: updatePayload.status };
}

function mapStatusCodeToLabel(statusCode) {
    const map = {
        0: 'queued',
        1: 'processing',
        2: 'encoding',
        3: 'finished',
        4: 'resolution_finished',
        5: 'failed',
        6: 'presigned_upload_started',
        7: 'presigned_upload_finished',
        8: 'presigned_upload_failed',
        9: 'captions_generated',
        10: 'title_description_generated'
    };

    return map[statusCode] ?? `status_${statusCode}`;
}

async function fetchBunnyMp4Url(videoId) {
    try {
        if (!BUNNY_STREAM_LIBRARY_ID || !BUNNY_STREAM_API_KEY || !BUNNY_STREAM_HOST) {
            console.warn('⚠️ [BunnyWebhook] Variáveis da Bunny para MP4 não configuradas.');
            return null;
        }

        const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'AccessKey': BUNNY_STREAM_API_KEY
            }
        });

        if (!response.ok) {
            console.warn('⚠️ [BunnyWebhook] Falha ao buscar detalhes do vídeo Bunny:', response.status, await response.text());
            return null;
        }

        const details = await response.json();
        const resolutionsRaw = details?.availableResolutions || details?.available_resolutions || '';
        const resolutionList = Array.isArray(resolutionsRaw)
            ? resolutionsRaw
            : typeof resolutionsRaw === 'string'
                ? resolutionsRaw.split(',')
                : [];

        const normalizedResolutions = resolutionList
            .map(res => parseInt(String(res).replace(/[^0-9]/g, ''), 10))
            .filter(num => !Number.isNaN(num))
            .sort((a, b) => b - a);

        const preferredResolution = 720;
        let chosenResolution = null;

        if (normalizedResolutions.length === 0) {
            console.warn('⚠️ [BunnyWebhook] Nenhuma resolução disponível para gerar MP4.');
            return null;
        }

        if (normalizedResolutions.includes(preferredResolution)) {
            chosenResolution = preferredResolution;
        } else {
            chosenResolution = normalizedResolutions.reduce((closest, current) => {
                if (closest === null) return current;
                const diffCurrent = Math.abs(current - preferredResolution);
                const diffClosest = Math.abs(closest - preferredResolution);
                if (diffCurrent < diffClosest) return current;
                if (diffCurrent === diffClosest) return current > closest ? current : closest;
                return closest;
            }, null);
        }

        const mp4Url = `https://${BUNNY_STREAM_HOST}/${videoId}/play_${chosenResolution}p.mp4`;
        console.log(`🎬 [BunnyWebhook] MP4 selecionado (${chosenResolution}p):`, mp4Url);
        return mp4Url;
    } catch (error) {
        console.error('❌ [BunnyWebhook] Erro ao buscar MP4 da Bunny:', error);
        return null;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Bunny-Signature');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const headerSignature = req.headers['x-bunny-signature'];
        const querySignature = req.query?.token || req.query?.signature || req.query?.secret;
        const signature = headerSignature || querySignature;
        console.log('🔐 [BunnyWebhook] Signature recebida:', signature);

        if (BUNNY_WEBHOOK_KEY) {
            if (!signature) {
                console.warn('⚠️ [BunnyWebhook] Nenhuma assinatura recebida, mas BUNNY_STREAM_WEBHOOK_KEY está configurado.');
                return res.status(401).json({ success: false, message: 'Missing signature' });
            }
            if (signature !== BUNNY_WEBHOOK_KEY) {
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }
        }

        const payload = req.body ?? {};
        console.log('📩 [BunnyWebhook] Payload recebido:', payload);

        const videoId = payload.VideoGuid || payload.videoId;
        const statusCodeRaw = payload.Status ?? payload.status;
        const statusCode = typeof statusCodeRaw === 'number' ? statusCodeRaw : Number(statusCodeRaw);
        const statusLabel = mapStatusCodeToLabel(statusCode);

        if (!videoId) {
            return res.status(400).json({ success: false, message: 'videoId is required' });
        }

        if (statusCode === 3) {
            console.log('✅ [BunnyWebhook] Status 3 (finished) recebido. Atualizando story.');
            await updateStoryStatus(videoId, payload);
        } else if (statusCode === 4) {
            console.log('✅ [BunnyWebhook] Status 4 (resolution finished) recebido. Atualizando story e enviando notificação.');
            const mp4Url = await fetchBunnyMp4Url(videoId);
            await updateStoryStatus(videoId, payload, {
                video_mp4_url: mp4Url || undefined,
            });
        } else if (statusLabel === 'failed' || statusCode === 5) {
            console.error(`❌ [BunnyWebhook] Encoding falhou para ${videoId}`, payload);
        } else {
            console.log(`ℹ️ [BunnyWebhook] Status '${statusLabel}' (${statusCode}) recebido para ${videoId}. Aguardando finalização.`);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('❌ [BunnyWebhook] Erro interno:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

