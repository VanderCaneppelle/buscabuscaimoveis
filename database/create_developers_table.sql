-- =====================================================
-- TABELA DE CONSTRUTORAS/INCORPORADORAS
-- =====================================================
-- Esta tabela armazena informações sobre construtoras e incorporadoras
-- Futuramente terá um cadastro próprio onde usuários podem adicionar suas construtoras

CREATE TABLE IF NOT EXISTS developers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Informações básicas
    name TEXT NOT NULL, -- Nome principal (ex: "A10", "A2D")
    name_composition TEXT, -- Complemento do nome (ex: "Empreendimentos", "Construtora")
    full_name TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN name_composition IS NOT NULL THEN name || ' ' || name_composition
            ELSE name
        END
    ) STORED, -- Nome completo gerado automaticamente
    
    -- Localização
    city_name TEXT, -- Cidade onde atua
    city_uf TEXT, -- Estado (UF)
    
    -- Informações de contato (para cadastro futuro)
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Logo e imagens
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- Descrição e informações adicionais
    description TEXT,
    cnpj TEXT, -- Para construtoras cadastradas
    
    -- Controle de usuário (para cadastro futuro)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuário que criou/gerencia
    is_verified BOOLEAN DEFAULT false, -- Se foi verificada pela administração
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_developer_name_city UNIQUE NULLS NOT DISTINCT (name, name_composition, city_name, city_uf)
);

-- =====================================================
-- ADICIONAR COLUNA DEVELOPER_ID NA TABELA PROPERTIES
-- =====================================================
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES developers(id) ON DELETE SET NULL;

-- =====================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_developers_name ON developers(name);
CREATE INDEX IF NOT EXISTS idx_developers_city ON developers(city_name, city_uf);
CREATE INDEX IF NOT EXISTS idx_developers_user_id ON developers(user_id);
CREATE INDEX IF NOT EXISTS idx_developers_is_active ON developers(is_active);
CREATE INDEX IF NOT EXISTS idx_developers_full_name ON developers(full_name);
CREATE INDEX IF NOT EXISTS idx_properties_developer_id ON properties(developer_id);

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_developers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_developers_updated_at
    BEFORE UPDATE ON developers
    FOR EACH ROW
    EXECUTE FUNCTION update_developers_updated_at();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================
-- Habilitar RLS
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;

-- Todos podem visualizar construtoras ativas
CREATE POLICY "Todos podem visualizar construtoras ativas" ON developers
    FOR SELECT USING (is_active = true);

-- Apenas admins podem inserir novas construtoras (por enquanto)
CREATE POLICY "Admins podem inserir construtoras" ON developers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Usuários podem atualizar suas próprias construtoras (para cadastro futuro)
CREATE POLICY "Usuários podem atualizar suas construtoras" ON developers
    FOR UPDATE USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Apenas admins podem deletar
CREATE POLICY "Admins podem deletar construtoras" ON developers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- =====================================================
-- COMENTÁRIOS NA TABELA
-- =====================================================
COMMENT ON TABLE developers IS 'Tabela de construtoras e incorporadoras. Futuramente terá cadastro próprio.';
COMMENT ON COLUMN developers.full_name IS 'Nome completo gerado automaticamente concatenando name e name_composition';
COMMENT ON COLUMN developers.is_verified IS 'Indica se a construtora foi verificada pela administração';
COMMENT ON COLUMN developers.user_id IS 'Usuário que criou/gerencia a construtora (para cadastro futuro)';

