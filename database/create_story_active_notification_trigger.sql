-- Habilitar extensão para chamadas HTTP (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função para enviar notificações quando um story fica ativo
CREATE OR REPLACE FUNCTION public.notify_story_active()
RETURNS trigger AS $$
DECLARE
    notif_url TEXT;
    notif_secret TEXT;
    headers JSONB;
    title TEXT;
    body TEXT;
BEGIN
    SELECT url, secret
    INTO notif_url, notif_secret
    FROM public.app_notifications_config
    WHERE id = TRUE
    LIMIT 1;

    IF notif_url IS NULL OR notif_url = '' THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'INSERT' AND NEW.status = 'active')
        OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND COALESCE(OLD.status, '') <> 'active')
    THEN
        headers := jsonb_build_object('Content-Type', 'application/json');
        IF notif_secret IS NOT NULL AND notif_secret <> '' THEN
            headers := headers || jsonb_build_object('X-Notifications-Secret', notif_secret);
        END IF;

        title := COALESCE(NEW.title, '🆕 Novo Story publicado');
        body := COALESCE(NULLIF(TRIM(COALESCE(NEW.notification_title, '')), ''), '💰URGENTE 🚨 Vai lá no Busca Busca agora que saiu uma oportunidade!!!!');

        PERFORM net.http_post(
            url := notif_url,
            headers := headers,
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
            )
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

-- Tabela de configuração (caso não exista)
CREATE TABLE IF NOT EXISTS public.app_notifications_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    url TEXT NOT NULL,
    secret TEXT
);

-- Inserir linha padrão se não existir
INSERT INTO public.app_notifications_config (id, url, secret)
VALUES (TRUE, '', NULL)
ON CONFLICT (id) DO NOTHING;

