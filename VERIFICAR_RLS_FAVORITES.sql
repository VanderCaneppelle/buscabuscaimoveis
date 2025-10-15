-- =====================================================
-- VERIFICAR POLÍTICAS RLS EM FAVORITES
-- =====================================================

-- Ver todas as políticas em favorites
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd as operacao,
    qual as usando_expressao,
    with_check as com_verificacao
FROM pg_policies 
WHERE tablename = 'favorites'
ORDER BY cmd, policyname;

