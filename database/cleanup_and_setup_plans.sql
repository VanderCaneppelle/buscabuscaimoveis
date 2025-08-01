-- Script para limpar e configurar apenas os 4 planos corretos
-- Execute este script após executar o user_plans_system.sql

-- 1. Limpar todos os planos existentes
DELETE FROM plans;

-- 2. Inserir apenas os 4 planos corretos
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'free', 'Gratuito', 0, 0.00, ARRAY['Visualizar anúncios'], true),
('550e8400-e29b-41d4-a716-446655440002', 'bronze', 'Bronze', 5, 39.99, ARRAY['5 anúncios ativos', 'Suporte por email', 'Fotos ilimitadas'], true),
('550e8400-e29b-41d4-a716-446655440003', 'silver', 'Prata', 10, 59.90, ARRAY['10 anúncios ativos', 'Suporte prioritário', 'Destaque nos resultados', 'Relatórios básicos'], true),
('550e8400-e29b-41d4-a716-446655440004', 'gold', 'Ouro', 50, 99.90, ARRAY['50 anúncios ativos', 'Suporte 24/7', 'Destaque premium', 'Relatórios avançados', 'API de integração'], true);

-- 3. Verificar se os planos foram inseridos corretamente
SELECT id, name, display_name, max_ads, price, is_active FROM plans ORDER BY price; 