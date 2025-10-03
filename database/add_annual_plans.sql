-- Script para adicionar planos anuais
-- Este script cria planos anuais com os mesmos nomes dos mensais + "_annual"

-- 1. Adicionar coluna 'period' na tabela plans (se não existir)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS period TEXT DEFAULT 'monthly' CHECK (period IN ('monthly', 'annual'));

-- 2. Atualizar planos existentes para serem mensais
UPDATE plans SET period = 'monthly' WHERE period IS NULL;

-- 3. Criar planos anuais baseados nos planos mensais existentes
-- Bronze Anual
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active, period) VALUES
('550e8400-e29b-41d4-a716-446655440005', 'bronze_annual', 'Bronze Anual', 5, 19.99, ARRAY['Até 5 anúncios', 'Até 10 fotos por anúncio', 'Suporte por email', 'Economia de 2 meses'], true, 'annual');

-- Silver Anual  
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active, period) VALUES
('550e8400-e29b-41d4-a716-446655440006', 'silver_annual', 'Prata Anual', 10, 29.99, ARRAY['Até 10 anúncios ativos', 'Até 15 fotos por anúncio', 'Suporte prioritário', 'Destaque nos resultados', 'Relatórios básicos', 'Economia de 2 meses'], true, 'annual');

-- Gold Anual
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active, period) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'gold_annual', 'Ouro Anual', 50, 39.99, ARRAY['50 anúncios ativos', 'Até 15 fotos por anúncio', 'Suporte 24/7', 'Destaque premium', 'Relatórios avançados', 'API de integração', 'Economia de 2 meses'], true, 'annual');

-- Essential Anual
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active, period) VALUES
('550e8400-e29b-41d4-a716-446655440008', 'essential_annual', 'Essencial Anual', 1, 9.99, ARRAY['1 anúncio ativo', 'Até 5 fotos por anúncio', 'Suporte básico', 'Economia de 2 meses'], true, 'annual');

-- 4. Verificar se os planos foram criados corretamente
SELECT id, name, display_name, max_ads, price, period, is_active FROM plans ORDER BY period, price;
