-- =====================================================
-- RLS COMPLETO PARA PROPERTIES
-- =====================================================
-- Políticas otimizadas para funcionar com Realtime
-- =====================================================

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Admins podem ver todas as propriedades" ON properties;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer propriedade" ON properties;
DROP POLICY IF EXISTS "Admins podem deletar qualquer propriedade" ON properties;
DROP POLICY IF EXISTS "Users podem criar propriedades" ON properties;
DROP POLICY IF EXISTS "Users podem ver suas próprias propriedades" ON properties;
DROP POLICY IF EXISTS "Users podem atualizar suas próprias propriedades" ON properties;
DROP POLICY IF EXISTS "Users podem deletar suas próprias propriedades" ON properties;
DROP POLICY IF EXISTS "Todos podem ver imóveis aprovados e ativos" ON properties;

-- =====================================================
-- SELECT (Visualizar)
-- =====================================================

-- 1. TODOS podem ver imóveis APROVADOS e ATIVOS (marketplace)
CREATE POLICY "select_approved_active_properties"
ON properties
FOR SELECT
TO public
USING (
    status = 'approved' AND ad_status = 'active'
);

-- 2. DONOS podem ver TODOS os seus imóveis (aprovados, pendentes, rejeitados)
CREATE POLICY "select_own_properties"
ON properties
FOR SELECT
TO public
USING (
    auth.uid() = user_id
);

-- 3. ADMINS podem ver TODOS os imóveis
CREATE POLICY "select_all_properties_admin"
ON properties
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
    )
);

-- =====================================================
-- INSERT (Criar)
-- =====================================================

-- TODOS podem criar imóveis (com seu próprio user_id)
CREATE POLICY "insert_own_properties"
ON properties
FOR INSERT
TO public
WITH CHECK (
    auth.uid() = user_id
);

-- =====================================================
-- UPDATE (Atualizar)
-- =====================================================

-- 1. ADMINS podem atualizar TODOS os imóveis
CREATE POLICY "update_all_properties_admin"
ON properties
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
    )
);

-- 2. DONOS podem atualizar seus próprios imóveis
CREATE POLICY "update_own_properties"
ON properties
FOR UPDATE
TO public
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
);

-- =====================================================
-- DELETE (Deletar)
-- =====================================================

-- 1. ADMINS podem deletar TODOS os imóveis
CREATE POLICY "delete_all_properties_admin"
ON properties
FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.is_admin = true
    )
);

-- 2. DONOS podem deletar seus próprios imóveis
CREATE POLICY "delete_own_properties"
ON properties
FOR DELETE
TO public
USING (
    auth.uid() = user_id
);

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Ver todas as políticas criadas
SELECT 
    policyname,
    cmd as operacao,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '👑 Admin'
        WHEN policyname LIKE '%own%' THEN '👤 Dono'
        WHEN policyname LIKE '%approved%' THEN '🌐 Público'
        ELSE '❓ Outro'
    END as tipo,
    CASE 
        WHEN cmd = 'SELECT' THEN '👁️'
        WHEN cmd = 'INSERT' THEN '➕'
        WHEN cmd = 'UPDATE' THEN '✏️'
        WHEN cmd = 'DELETE' THEN '🗑️'
    END as icone
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY cmd, policyname;

-- Deve retornar 8 políticas:
-- SELECT: 3 (approved_active, own, admin)
-- INSERT: 1 (own)
-- UPDATE: 2 (admin, own)
-- DELETE: 2 (admin, own)

-- =====================================================
-- TESTAR REALTIME
-- =====================================================
-- 
-- Com as novas políticas:
-- 
-- 1. Usuário A (dono) vê: TODOS seus imóveis
-- 2. Usuário B (comum) vê: Apenas aprovados e ativos
-- 3. Admin vê: TODOS os imóveis
-- 
-- Quando admin REJEITA imóvel:
-- - Realtime envia UPDATE para TODOS (inclui Usuário B)
-- - Usuário B recebe evento e remove da lista ✅
-- 
-- =====================================================

-- =====================================================
-- RESUMO DAS PERMISSÕES
-- =====================================================
/*

╔═══════════════════════════════════════════════════════════════╗
║                    PERMISSÕES FINAIS                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  👁️  SELECT (Visualizar):                                     ║
║    ✅ Todos: Imóveis aprovados e ativos (marketplace)         ║
║    ✅ Dono: Todos os seus imóveis                             ║
║    ✅ Admin: Todos os imóveis                                 ║
║                                                                ║
║  ➕ INSERT (Criar):                                            ║
║    ✅ Todos: Podem criar com seu user_id                      ║
║                                                                ║
║  ✏️  UPDATE (Editar):                                         ║
║    ✅ Admin: Todos os imóveis                                 ║
║    ✅ Dono: Apenas seus próprios                              ║
║                                                                ║
║  🗑️  DELETE (Deletar):                                        ║
║    ✅ Admin: Todos os imóveis                                 ║
║    ✅ Dono: Apenas seus próprios                              ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝

REALTIME:
  - ✅ Usuários comuns RECEBEM eventos de imóveis aprovados/ativos
  - ✅ Quando rejeitado, UPDATE é propagado para todos
  - ✅ HomeScreen remove da lista instantaneamente

*/

-- =====================================================
-- INSTRUÇÕES FINAIS
-- =====================================================
-- 
-- 1. Execute este script completo
-- 2. Verifique que 8 políticas foram criadas
-- 3. Reabilite RLS: ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- 4. Teste rejeitar imóvel em 2 usuários
-- 5. Deve funcionar para AMBOS agora! ✅
-- 
-- =====================================================

