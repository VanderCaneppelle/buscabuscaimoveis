-- =====================================================
-- MIGRATION: Suporte a Apple In-App Purchase
-- =====================================================

-- Colunas para pagamentos via Apple IAP
ALTER TABLE payments ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS apple_product_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'mercado_pago';

-- Índice para idempotência (evitar processar mesma transação 2x)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_apple_transaction_id 
ON payments(apple_transaction_id) 
WHERE apple_transaction_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN payments.apple_transaction_id IS 'Transaction ID da Apple (para idempotência)';
COMMENT ON COLUMN payments.apple_product_id IS 'Product ID do App Store (ex: com.buscabuscaimoveis.plan.bronze.monthly)';
COMMENT ON COLUMN payments.payment_source IS 'mercado_pago ou apple_iap';
