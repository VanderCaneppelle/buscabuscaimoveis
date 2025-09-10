-- Tabela para armazenar tokens de dispositivos para notificações push
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active);

-- RLS (Row Level Security) - apenas usuários autenticados podem gerenciar seus próprios tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem gerenciar apenas seus próprios tokens
CREATE POLICY "Users can manage their own device tokens" ON device_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Política: sistema pode ler todos os tokens (para envio de notificações)
CREATE POLICY "System can read all device tokens" ON device_tokens
    FOR SELECT USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_device_tokens_updated_at();

-- Comentários para documentação
COMMENT ON TABLE device_tokens IS 'Armazena tokens de dispositivos para notificações push';
COMMENT ON COLUMN device_tokens.token IS 'Token único do dispositivo (Expo Push Token)';
COMMENT ON COLUMN device_tokens.user_id IS 'ID do usuário proprietário do dispositivo';
COMMENT ON COLUMN device_tokens.platform IS 'Plataforma do dispositivo (ios, android, web)';
COMMENT ON COLUMN device_tokens.is_active IS 'Se o token está ativo para receber notificações';
