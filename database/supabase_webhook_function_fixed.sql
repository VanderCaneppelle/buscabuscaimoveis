-- =====================================================
-- FUNÇÃO PARA PROCESSAR WEBHOOKS DO MERCADO PAGO (CORRIGIDA)
-- =====================================================

-- Função para processar webhook do Mercado Pago
CREATE OR REPLACE FUNCTION process_mercado_pago_webhook()
RETURNS TRIGGER AS $$
DECLARE
    payment_record payments%ROWTYPE;
    plan_record plans%ROWTYPE;
    plan_id UUID;
    user_id UUID;
BEGIN
    -- Log do webhook recebido
    RAISE LOG '🔔 Webhook recebido: payment_id=%, status=%, preference_id=%', 
        NEW.mercado_pago_payment_id, 
        NEW.status, 
        NEW.mercado_pago_preference_id;

    -- Se o status mudou para 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        RAISE LOG '✅ Pagamento aprovado! Ativando assinatura...';

        -- Extrair plan_id da descrição (formato: "Pagamento do plano {plan_id}")
        plan_id := SUBSTRING(NEW.description FROM 'plano ([a-f0-9-]+)')::UUID;
        user_id := NEW.user_id;

        RAISE LOG '📊 Dados extraídos: plan_id=%, user_id=%', plan_id, user_id;

        -- Verificar se o plano existe
        SELECT * INTO plan_record FROM plans WHERE id = plan_id;
        IF NOT FOUND THEN
            RAISE LOG '❌ Plano não encontrado: %', plan_id;
            RETURN NEW;
        END IF;

        -- Criar/atualizar assinatura
        INSERT INTO user_subscriptions (
            user_id,
            plan_id,
            status,
            start_date,
            end_date,
            payment_id,
            mercado_pago_subscription_id
        ) VALUES (
            user_id,
            plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '30 days',
            NEW.id,
            NEW.mercado_pago_payment_id
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            plan_id = plan_id,
            status = 'active',
            start_date = NOW(),
            end_date = NOW() + INTERVAL '30 days',
            payment_id = NEW.id,
            mercado_pago_subscription_id = NEW.mercado_pago_payment_id,
            updated_at = NOW();

        RAISE LOG '✅ Assinatura ativada com sucesso para usuário: %', user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função quando um pagamento for atualizado
DROP TRIGGER IF EXISTS trigger_process_mercado_pago_webhook ON payments;
CREATE TRIGGER trigger_process_mercado_pago_webhook
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION process_mercado_pago_webhook();

-- =====================================================
-- FUNÇÃO RPC PARA ATUALIZAR PAGAMENTO VIA WEBHOOK (CORRIGIDA)
-- =====================================================

CREATE OR REPLACE FUNCTION update_payment_from_webhook(
    payment_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    payment_record payments%ROWTYPE;
    preference_id TEXT;
    payment_id TEXT;
    payment_status TEXT;
BEGIN
    -- Extrair dados do webhook
    preference_id := payment_data->>'preference_id';
    payment_id := payment_data->>'id';
    payment_status := payment_data->>'status';

    RAISE LOG '🔍 Atualizando pagamento: preference_id=%, payment_id=%, status=%', 
        preference_id, payment_id, payment_status;

    -- Buscar pagamento pelo preference_id
    SELECT * INTO payment_record 
    FROM payments 
    WHERE mercado_pago_preference_id = preference_id
    AND payments.status = 'pending';

    IF NOT FOUND THEN
        RAISE LOG '❌ Pagamento não encontrado para preference_id: %', preference_id;
        RETURN jsonb_build_object('error', 'Pagamento não encontrado');
    END IF;

    -- Atualizar pagamento
    UPDATE payments 
    SET 
        status = payment_status,
        mercado_pago_payment_id = payment_id,
        updated_at = NOW()
    WHERE id = payment_record.id;

    RAISE LOG '✅ Pagamento atualizado: id=%, status=%', payment_record.id, payment_status;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', payment_record.id,
        'status', payment_status
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURAÇÃO DE PERMISSÕES
-- =====================================================

-- Permitir que a função seja executada por usuários autenticados
GRANT EXECUTE ON FUNCTION update_payment_from_webhook(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_from_webhook(JSONB) TO anon;

-- Permitir acesso às tabelas necessárias
GRANT SELECT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT ON plans TO authenticated; 