-- =====================================================
-- WEBHOOK SIMPLIFICADO DO SUPABASE
-- =====================================================

-- Função para processar pagamento aprovado
CREATE OR REPLACE FUNCTION handle_payment_approved()
RETURNS TRIGGER AS $$
DECLARE
    plan_record plans%ROWTYPE;
    plan_id UUID;
    user_id UUID;
BEGIN
    -- Log do evento
    RAISE LOG '🔔 Evento de pagamento: payment_id=%, status=%, preference_id=%', 
        NEW.id, 
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
DROP TRIGGER IF EXISTS trigger_handle_payment_approved ON payments;
CREATE TRIGGER trigger_handle_payment_approved
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_payment_approved();

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR PAGAMENTO VIA MERCADO PAGO
-- =====================================================

CREATE OR REPLACE FUNCTION update_payment_status(
    preference_id TEXT,
    payment_id TEXT,
    status TEXT
)
RETURNS JSONB AS $$
DECLARE
    payment_record payments%ROWTYPE;
BEGIN
    RAISE LOG '🔍 Atualizando pagamento: preference_id=%, payment_id=%, status=%', 
        preference_id, payment_id, status;

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
        status = status,
        mercado_pago_payment_id = payment_id,
        updated_at = NOW()
    WHERE id = payment_record.id;

    RAISE LOG '✅ Pagamento atualizado: id=%, status=%', payment_record.id, status;

    -- Retornar sucesso
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', payment_record.id,
        'status', status
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURAÇÃO DE PERMISSÕES
-- =====================================================

GRANT EXECUTE ON FUNCTION update_payment_status(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status(TEXT, TEXT, TEXT) TO anon;
GRANT SELECT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT ON plans TO authenticated; 