-- =====================================================
-- INTEGRAÇÃO DE PAGAMENTOS - MERCADO PAGO
-- =====================================================

-- Atualizar tabela de pagamentos existente
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mercado_pago_preference_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_mercado_pago_payment_id ON payments(mercado_pago_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mercado_pago_preference_id ON payments(mercado_pago_preference_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_reference ON payments(external_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Atualizar tabela de assinaturas para incluir referência do Mercado Pago
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS mercado_pago_subscription_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- Criar função para processar webhook do Mercado Pago
CREATE OR REPLACE FUNCTION process_mercado_pago_webhook(
    payment_data JSONB
) RETURNS JSONB AS $$
DECLARE
    payment_record payments%ROWTYPE;
    subscription_record user_subscriptions%ROWTYPE;
    plan_record plans%ROWTYPE;
    external_ref TEXT;
    plan_name TEXT;
    user_uuid UUID;
BEGIN
    -- Extrair dados do webhook
    external_ref := payment_data->>'external_reference';
    plan_name := SPLIT_PART(external_ref, '_', 2);
    user_uuid := SPLIT_PART(external_ref, '_', 4)::UUID;
    
    -- Buscar pagamento pela preferência
    SELECT * INTO payment_record 
    FROM payments 
    WHERE mercado_pago_preference_id = payment_data->>'preference_id';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pagamento não encontrado');
    END IF;
    
    -- Atualizar status do pagamento
    UPDATE payments 
    SET 
        status = payment_data->>'status',
        mercado_pago_payment_id = payment_data->>'id',
        updated_at = NOW()
    WHERE id = payment_record.id;
    
    -- Se pagamento aprovado, ativar assinatura
    IF payment_data->>'status' = 'approved' THEN
        -- Buscar plano
        SELECT * INTO plan_record 
        FROM plans 
        WHERE name = plan_name;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error', 'Plano não encontrado');
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
            user_uuid,
            plan_record.id,
            'active',
            NOW(),
            NOW() + INTERVAL '30 days',
            payment_record.id,
            payment_data->>'id'
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET
            plan_id = plan_record.id,
            status = 'active',
            start_date = NOW(),
            end_date = NOW() + INTERVAL '30 days',
            payment_id = payment_record.id,
            mercado_pago_subscription_id = payment_data->>'id',
            updated_at = NOW();
            
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Assinatura ativada com sucesso',
            'payment_id', payment_record.id,
            'subscription_id', payment_data->>'id'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Status do pagamento atualizado',
        'payment_id', payment_record.id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar status de pagamento
CREATE OR REPLACE FUNCTION check_payment_status(
    payment_uuid UUID
) RETURNS JSONB AS $$
DECLARE
    payment_record payments%ROWTYPE;
    subscription_record user_subscriptions%ROWTYPE;
BEGIN
    -- Buscar pagamento
    SELECT * INTO payment_record 
    FROM payments 
    WHERE id = payment_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pagamento não encontrado');
    END IF;
    
    -- Buscar assinatura relacionada
    SELECT * INTO subscription_record 
    FROM user_subscriptions 
    WHERE payment_id = payment_uuid;
    
    RETURN jsonb_build_object(
        'payment', jsonb_build_object(
            'id', payment_record.id,
            'status', payment_record.status,
            'amount', payment_record.amount,
            'created_at', payment_record.created_at,
            'mercado_pago_payment_id', payment_record.mercado_pago_payment_id
        ),
        'subscription', CASE 
            WHEN subscription_record.id IS NOT NULL THEN
                jsonb_build_object(
                    'id', subscription_record.id,
                    'status', subscription_record.status,
                    'start_date', subscription_record.start_date,
                    'end_date', subscription_record.end_date
                )
            ELSE NULL
        END
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Criar função para obter histórico de pagamentos do usuário
CREATE OR REPLACE FUNCTION get_user_payment_history(
    user_uuid UUID
) RETURNS JSONB AS $$
DECLARE
    payment_records RECORD;
    result JSONB := '[]'::JSONB;
BEGIN
    FOR payment_records IN
        SELECT 
            p.*,
            pl.name as plan_name,
            pl.display_name as plan_display_name,
            pl.price as plan_price,
            us.status as subscription_status,
            us.start_date as subscription_start,
            us.end_date as subscription_end
        FROM payments p
        LEFT JOIN plans pl ON p.description LIKE '%' || pl.name || '%'
        LEFT JOIN user_subscriptions us ON us.payment_id = p.id
        WHERE p.user_id = user_uuid
        ORDER BY p.created_at DESC
    LOOP
        result := result || jsonb_build_object(
            'id', payment_records.id,
            'amount', payment_records.amount,
            'status', payment_records.status,
            'payment_method', payment_records.payment_method,
            'created_at', payment_records.created_at,
            'plan', jsonb_build_object(
                'name', payment_records.plan_name,
                'display_name', payment_records.plan_display_name,
                'price', payment_records.plan_price
            ),
            'subscription', CASE 
                WHEN payment_records.subscription_status IS NOT NULL THEN
                    jsonb_build_object(
                        'status', payment_records.subscription_status,
                        'start_date', payment_records.subscription_start,
                        'end_date', payment_records.subscription_end
                    )
                ELSE NULL
            END
        );
    END LOOP;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Criar view para relatórios de pagamento
CREATE OR REPLACE VIEW payment_reports AS
SELECT 
    p.id as payment_id,
    p.user_id,
    p.amount,
    p.status as payment_status,
    p.payment_method,
    p.created_at as payment_date,
    pl.name as plan_name,
    pl.display_name as plan_display_name,
    us.status as subscription_status,
    us.start_date as subscription_start,
    us.end_date as subscription_end,
    CASE 
        WHEN p.status = 'approved' THEN 'Aprovado'
        WHEN p.status = 'rejected' THEN 'Rejeitado'
        WHEN p.status = 'cancelled' THEN 'Cancelado'
        WHEN p.status = 'pending' THEN 'Pendente'
        ELSE 'Desconhecido'
    END as status_description
FROM payments p
LEFT JOIN plans pl ON p.description LIKE '%' || pl.name || '%'
LEFT JOIN user_subscriptions us ON us.payment_id = p.id;

-- Criar políticas RLS para pagamentos
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus pagamentos
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem seus próprios pagamentos
CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para sistema atualizar pagamentos (webhook)
CREATE POLICY "System can update payments" ON payments
    FOR UPDATE USING (true);

-- Criar trigger para log de pagamentos
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_logs (payment_id, action, old_status, new_status)
        VALUES (NEW.id, 'status_change', OLD.status, NEW.status);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_status_change_trigger
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_changes();

-- Inserir dados de exemplo para testes (opcional)
-- INSERT INTO payments (user_id, amount, currency, status, payment_method, description)
-- VALUES 
--     ('550e8400-e29b-41d4-a716-446655440001', 39.99, 'BRL', 'approved', 'mercadopago', 'Pagamento do plano bronze'),
--     ('550e8400-e29b-41d4-a716-446655440002', 59.90, 'BRL', 'pending', 'mercadopago', 'Pagamento do plano silver');

-- Comentários sobre as funções
COMMENT ON FUNCTION process_mercado_pago_webhook(JSONB) IS 'Processa webhook do Mercado Pago e atualiza status do pagamento/assinatura';
COMMENT ON FUNCTION check_payment_status(UUID) IS 'Verifica status de um pagamento específico';
COMMENT ON FUNCTION get_user_payment_history(UUID) IS 'Retorna histórico completo de pagamentos de um usuário';
COMMENT ON VIEW payment_reports IS 'View para relatórios de pagamento com informações consolidadas'; 