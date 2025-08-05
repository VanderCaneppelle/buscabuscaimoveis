-- =====================================================
-- WEBHOOK UNIFICADO FINAL
-- =====================================================

-- Função unificada para processar webhooks do Mercado Pago
CREATE OR REPLACE FUNCTION process_mercado_pago_webhook(
    payment_data JSONB DEFAULT NULL,
    preference_id TEXT DEFAULT NULL,
    payment_id TEXT DEFAULT NULL,
    status TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    payment_record payments%ROWTYPE;
    final_preference_id TEXT;
    final_payment_id TEXT;
    final_status TEXT;
    data_obj JSONB;
BEGIN
    -- Determinar os valores finais baseado nos parâmetros fornecidos
    IF payment_data IS NOT NULL THEN
        -- Modo webhook: extrair dados do JSON
        RAISE LOG '🔔 Webhook recebido: %', payment_data;
        
        data_obj := payment_data->'data';
        final_payment_id := data_obj->>'id';
        final_preference_id := payment_data->>'preference_id';
        
        -- Determinar status baseado no tipo de evento
        IF payment_data->>'action' = 'updated' OR payment_data->>'type' = 'payment' THEN
            final_status := 'approved';
        ELSE
            final_status := 'pending';
        END IF;
    ELSE
        -- Modo direto: usar parâmetros fornecidos
        final_preference_id := preference_id;
        final_payment_id := payment_id;
        final_status := status;
    END IF;

    RAISE LOG '🔍 Processando: preference_id=%, payment_id=%, status=%', 
        final_preference_id, final_payment_id, final_status;

    -- Buscar pagamento (tentar por preference_id primeiro, depois por payment_id)
    SELECT * INTO payment_record 
    FROM payments 
    WHERE (final_preference_id IS NOT NULL AND mercado_pago_preference_id = final_preference_id)
       OR (final_payment_id IS NOT NULL AND mercado_pago_payment_id = final_payment_id)
       OR (final_preference_id IS NOT NULL AND status = 'pending')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE LOG '❌ Pagamento não encontrado para: preference_id=%, payment_id=%', 
            final_preference_id, final_payment_id;
        RETURN jsonb_build_object('error', 'Pagamento não encontrado');
    END IF;

    -- Atualizar pagamento
    UPDATE payments 
    SET 
        status = final_status,
        mercado_pago_payment_id = COALESCE(final_payment_id, mercado_pago_payment_id),
        updated_at = NOW()
    WHERE id = payment_record.id;

    RAISE LOG '✅ Pagamento atualizado: id=%, status=%', payment_record.id, final_status;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', payment_record.id,
        'status', final_status
    );
END;
$$ LANGUAGE plpgsql;

-- Função para processar pagamento aprovado (trigger)
CREATE OR REPLACE FUNCTION handle_payment_approved()
RETURNS TRIGGER AS $$
DECLARE
    plan_record plans%ROWTYPE;
    plan_id UUID;
    user_id UUID;
BEGIN
    -- Se o status mudou para 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        RAISE LOG '✅ Pagamento aprovado! Ativando assinatura...';

        -- Extrair plan_id da descrição
        plan_id := SUBSTRING(NEW.description FROM 'plano ([a-f0-9-]+)')::UUID;
        user_id := NEW.user_id;

        -- Verificar se o plano existe
        SELECT * INTO plan_record FROM plans WHERE id = plan_id;
        IF NOT FOUND THEN
            RAISE LOG '❌ Plano não encontrado: %', plan_id;
            RETURN NEW;
        END IF;

        -- Criar/atualizar assinatura
        INSERT INTO user_subscriptions (
            user_id, plan_id, status, start_date, end_date, 
            payment_id, mercado_pago_subscription_id
        ) VALUES (
            user_id, plan_id, 'active', NOW(), 
            NOW() + INTERVAL '30 days', NEW.id, NEW.mercado_pago_payment_id
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            plan_id = plan_id, status = 'active', start_date = NOW(),
            end_date = NOW() + INTERVAL '30 days', payment_id = NEW.id,
            mercado_pago_subscription_id = NEW.mercado_pago_payment_id, updated_at = NOW();

        RAISE LOG '✅ Assinatura ativada para usuário: %', user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS trigger_handle_payment_approved ON payments;
CREATE TRIGGER trigger_handle_payment_approved
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_payment_approved();

-- =====================================================
-- CONFIGURAÇÃO DE PERMISSÕES
-- =====================================================

-- Permitir acesso sem autenticação para webhooks
GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook(JSONB, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION process_mercado_pago_webhook(JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT SELECT, UPDATE ON payments TO anon;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO anon;
GRANT SELECT ON plans TO anon; 