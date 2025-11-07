import '../env.js';
import fetch from 'node-fetch';
import { supabase } from '../../lib/supabase.js';

const BUNNY_WEBHOOK_KEY = process.env.BUNNY_STREAM_WEBHOOK_KEY;

async function updateStoryStatus(videoId, statusPayload) {
    const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('bunny_video_id', videoId)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('❌ [BunnyWebhook] Erro ao buscar story:', videoId, error);
        return;
    }

    if (!data) {
        console.warn('⚠️ [BunnyWebhook] Nenhum story encontrado para videoId:', videoId);
        return;
    }

    const storyId = data.id;

    const updatePayload = {
        status: 'active',
        updated_at: new Date().toISOString(),
        encoding_metadata: statusPayload || null
    };

    const { error: updateError } = await supabase
        .from('stories')
        .update(updatePayload)
        .eq('id', storyId);

    if (updateError) {
        console.error('❌ [BunnyWebhook] Erro ao atualizar story:', storyId, updateError);
    } else {
        console.log('✅ [BunnyWebhook] Story ativado:', storyId);
    }
}

async function sendNotification(videoId) {
    try {
        const apiUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

        if (!apiUrl) {
            console.warn('⚠️ [BunnyWebhook] API_BASE_URL não configurada, notificações desabilitadas.');
            return;
        }

        const response = await fetch(`${apiUrl}/api/notifications?action=send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '🆕 Novo Story publicado',
                body: 'Confira agora mesmo!',
                data: {
                    type: 'new_story',
                    screen: 'StoryViewer',
                    params: {
                        forceReload: true,
                        bunnyVideoId: videoId
                    }
                },
                sendToAll: true
            })
        });

        if (!response.ok) {
            console.error('❌ [BunnyWebhook] Falha ao enviar notificação:', response.status, await response.text());
        } else {
            console.log('✅ [BunnyWebhook] Notificação disparada para videoId:', videoId);
        }
    } catch (error) {
        console.error('❌ [BunnyWebhook] Erro ao enviar notificação:', error);
    }
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
        const signature = req.headers['x-bunny-signature'];
        console.log('🔐 [BunnyWebhook] Signature recebida:', signature);

        if (BUNNY_WEBHOOK_KEY && signature !== BUNNY_WEBHOOK_KEY) {
            return res.status(401).json({ success: false, message: 'Invalid signature' });
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

        const finalStatuses = new Set(['completed', 'ready', 'encoded', 'finished', 'resolution_finished']);
        const finalStatusCodes = new Set([3, 4]);

        if (finalStatuses.has(statusLabel) || finalStatusCodes.has(statusCode)) {
            await updateStoryStatus(videoId, payload);
            await sendNotification(videoId);
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

