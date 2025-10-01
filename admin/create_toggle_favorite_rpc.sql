    -- =====================================================
    -- RPC: toggle_favorite(user_id, property_id)
    -- Alterna favorito de forma idempotente e atômica
    -- Retorna: { favorited boolean }
    -- Pré-requisitos:
    --   - Tabela favorites(user_id uuid, property_id uuid) com UNIQUE(user_id, property_id)
    --   - RLS habilitado conforme políticas do projeto
    -- =====================================================

CREATE OR REPLACE FUNCTION public.toggle_favorite(
    p_user_id uuid,
    p_property_id uuid
    )
    RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, auth
    SECURITY DEFINER
    AS $$
    DECLARE
    v_exists boolean;
    BEGIN
    -- Verificar se já está favoritado
    SELECT true INTO v_exists
    FROM public.favorites
    WHERE user_id = p_user_id AND property_id = p_property_id
    LIMIT 1;

    IF v_exists IS TRUE THEN
        -- Já existe: remover
        DELETE FROM public.favorites
        WHERE user_id = p_user_id AND property_id = p_property_id;
        RETURN jsonb_build_object('favorited', false);
    ELSE
        -- Não existe: inserir (idempotente contra corridas)
        INSERT INTO public.favorites(user_id, property_id)
        VALUES (p_user_id, p_property_id)
        ON CONFLICT (user_id, property_id) DO NOTHING;
        RETURN jsonb_build_object('favorited', true);
    END IF;
    END;
    $$;

    -- Opcional: conceder EXECUTE para roles autenticadas
    GRANT EXECUTE ON FUNCTION public.toggle_favorite(uuid, uuid) TO authenticated;


