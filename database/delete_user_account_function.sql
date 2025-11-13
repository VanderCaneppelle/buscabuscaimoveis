-- =====================================================
-- FUNÇÃO PARA DELETAR CONTA DE USUÁRIO COMPLETAMENTE
-- =====================================================
-- Esta função deleta todos os dados relacionados ao usuário
-- e depois deleta a conta de autenticação do Supabase
-- 
-- IMPORTANTE: Esta função deve ser chamada apenas via API
-- com autenticação adequada, pois requer privilégios elevados

CREATE OR REPLACE FUNCTION public.delete_user_account(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_data JSONB;
    properties_count INTEGER;
    stories_count INTEGER;
    favorites_count INTEGER;
    notifications_count INTEGER;
    subscriptions_count INTEGER;
    payments_count INTEGER;
BEGIN
    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não encontrado'
        );
    END IF;

    -- Contar dados antes de deletar (para log)
    SELECT COUNT(*) INTO properties_count FROM properties WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO stories_count FROM stories WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO favorites_count FROM favorites WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO notifications_count FROM in_app_notifications WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO subscriptions_count FROM user_subscriptions WHERE user_id = user_uuid;
    SELECT COUNT(*) INTO payments_count FROM payments WHERE user_id = user_uuid;

    -- Deletar dados relacionados (em ordem para evitar problemas de foreign key)
    
    -- 1. Deletar boosts de propriedades (se existir a tabela)
    DELETE FROM property_boosts WHERE user_id = user_uuid;
    
    -- 2. Deletar favoritos
    DELETE FROM favorites WHERE user_id = user_uuid;
    
    -- 3. Deletar notificações in-app
    DELETE FROM in_app_notifications WHERE user_id = user_uuid;
    
    -- 4. Deletar tokens de dispositivo
    DELETE FROM device_tokens WHERE user_id = user_uuid;
    
    -- 5. Deletar sessões ativas
    DELETE FROM active_sessions WHERE user_id = user_uuid;
    
    -- 6. Deletar stories (CASCADE já deve deletar, mas garantimos)
    DELETE FROM stories WHERE user_id = user_uuid;
    
    -- 7. Deletar propriedades/imóveis (CASCADE já deve deletar, mas garantimos)
    DELETE FROM properties WHERE user_id = user_uuid;
    
    -- 8. Deletar assinaturas (CASCADE já deve deletar, mas garantimos)
    DELETE FROM user_subscriptions WHERE user_id = user_uuid;
    
    -- 9. Deletar pagamentos
    DELETE FROM payments WHERE user_id = user_uuid;
    
    -- 10. Deletar perfil
    DELETE FROM profiles WHERE id = user_uuid;
    
    -- Preparar resposta com contadores
    deleted_data := jsonb_build_object(
        'success', true,
        'deleted', jsonb_build_object(
            'properties', properties_count,
            'stories', stories_count,
            'favorites', favorites_count,
            'notifications', notifications_count,
            'subscriptions', subscriptions_count,
            'payments', payments_count
        )
    );

    RETURN deleted_data;

EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar mensagem de erro
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.delete_user_account(UUID) IS 
'Deleta todos os dados relacionados a um usuário. Deve ser chamada via API autenticada. A conta de autenticação (auth.users) deve ser deletada separadamente via Supabase Admin API.';

-- =====================================================
-- TESTE DA FUNÇÃO (descomente para testar)
-- =====================================================
-- SELECT public.delete_user_account('USER_ID_AQUI');

