-- Habilitar extensão para chamadas HTTP (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função para enviar notificações quando um story fica ativo
CREATE OR REPLACE FUNCTION public.notify_story_active()
RETURNS trigger AS $$
DECLARE
    notif_url TEXT;
    secret TEXT;
    headers JSONB;
    title TEXT;
    body TEXT;
BEGIN
    notif_url := current_setting('app.notifications_url', true);
    IF notif_url IS NULL OR notif_url = '' THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'INSERT' AND NEW.status = 'active')
        OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active')
    THEN
        headers := jsonb_build_object('Content-Type', 'application/json');
        secret := current_setting('app.notifications_secret', true);
        IF secret IS NOT NULL AND secret <> '' THEN
            headers := headers || jsonb_build_object('X-Notifications-Secret', secret);
        END IF;

        title := COALESCE(NEW.title, '🆕 Novo Story publicado');
        body := 'Confira agora mesmo!';

        PERFORM net.http_post(
            url := notif_url,
            headers := headers::text,
            body := jsonb_build_object(
                'title', title,
                'body', body,
                'data', jsonb_build_object(
                    'type', 'new_story',
                    'screen', 'StoryViewer',
                    'params', jsonb_build_object(
                        'forceReload', true,
                        'initialStoryId', NEW.id,
                        'bunnyVideoId', NEW.bunny_video_id
                    )
                ),
                'sendToAll', true
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trg_notify_story_active ON stories;
CREATE TRIGGER trg_notify_story_active
AFTER INSERT OR UPDATE ON public.stories
FOR EACH ROW EXECUTE FUNCTION public.notify_story_active();

