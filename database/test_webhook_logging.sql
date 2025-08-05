-- =====================================================
-- FUNÇÃO PARA TESTAR E LOGAR WEBHOOKS
-- =====================================================

-- Função para logar webhooks recebidos
CREATE OR REPLACE FUNCTION log_webhook_received(
    webhook_data JSONB
)
RETURNS JSONB AS $$
BEGIN
    -- Log detalhado do webhook
    RAISE LOG '🔔 WEBHOOK RECEBIDO: %', webhook_data;
    
    -- Log específico dos campos importantes
    RAISE LOG '📊 Dados do webhook: action=%, type=%, data=%', 
        webhook_data->>'action',
        webhook_data->>'type',
        webhook_data->'data';
    
    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Webhook logado com sucesso',
        'received_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Permitir acesso anônimo
GRANT EXECUTE ON FUNCTION log_webhook_received(JSONB) TO anon;

-- Testar a função
SELECT log_webhook_received(
    '{
        "action": "updated",
        "application_id": "4373011936551233",
        "data": {"id": "123456"},
        "date": "2021-11-01T02:02:02Z",
        "entity": "preapproval",
        "id": "123456",
        "type": "subscription_preapproval",
        "version": 8
    }'::jsonb
); 