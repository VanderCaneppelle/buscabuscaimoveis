-- =====================================================
-- TRIGGER PARA GERAR AD_ID AUTOMATICAMENTE
-- =====================================================
-- Gera um ID amigável no formato BB77DE3F quando um anúncio é criado
-- Baseado nos primeiros 6 caracteres do UUID

-- Função para gerar ad_id a partir do UUID
CREATE OR REPLACE FUNCTION generate_ad_id()
RETURNS TRIGGER AS $$
DECLARE
    clean_uuid TEXT;
    short_part TEXT;
    alphanumeric TEXT;
    final_id TEXT;
BEGIN
    -- Apenas gerar se ad_id estiver vazio/null
    IF NEW.ad_id IS NULL OR NEW.ad_id = '' THEN
        -- Remover hífens e converter para maiúsculo
        clean_uuid := REPLACE(NEW.id::TEXT, '-', '');
        clean_uuid := UPPER(clean_uuid);
        
        -- Usar os primeiros 6 caracteres
        short_part := SUBSTRING(clean_uuid, 1, 6);
        
        -- Garantir que seja alfanumérico (remover caracteres especiais se houver)
        alphanumeric := REGEXP_REPLACE(short_part, '[^A-Z0-9]', '', 'g');
        
        -- Se for menor que 6, completar com zeros
        alphanumeric := RPAD(alphanumeric, 6, '0');
        
        -- Adicionar prefixo BB
        final_id := 'BB' || alphanumeric;
        
        -- Atribuir ao NEW.ad_id
        NEW.ad_id := final_id;
        
        RAISE NOTICE 'ad_id gerado: % para property UUID: %', final_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger BEFORE INSERT
DROP TRIGGER IF EXISTS generate_ad_id_trigger ON properties;
CREATE TRIGGER generate_ad_id_trigger
    BEFORE INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION generate_ad_id();

-- Verificar se o trigger foi criado
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'generate_ad_id_trigger';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger generate_ad_id_trigger criado com sucesso!';
    RAISE NOTICE '✅ Novos anúncios terão ad_id gerado automaticamente no formato BB + 6 caracteres';
END $$;
