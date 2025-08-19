# 🗑️ Configuração da Funcionalidade de Exclusão de Stories

## 📋 Visão Geral

Esta funcionalidade permite que apenas o criador de um story possa excluí-lo, removendo tanto o registro do banco de dados quanto as mídias dos storages (Cloudinary e Supabase).

## 🔧 Configuração Necessária

### 1. Banco de Dados

Execute os seguintes scripts SQL no Supabase:

#### 1.1 Adicionar campo user_id
```sql
-- Executar: database/add_user_id_to_stories.sql
```

#### 1.2 Configurar políticas RLS
```sql
-- Executar: database/stories_rls_policies.sql
```

### 2. Configuração do Cloudinary (Opcional)

Para excluir arquivos do Cloudinary automaticamente, você precisa configurar as credenciais:

#### 2.1 Variáveis de Ambiente
Adicione ao seu arquivo de configuração:
```env
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
CLOUDINARY_CLOUD_NAME=seu_cloud_name
```

#### 2.2 Atualizar StoryService
Descomente e configure as linhas no arquivo `lib/storyService.js`:
```javascript
const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        public_id: publicId,
        api_key: process.env.CLOUDINARY_API_KEY,
        signature: process.env.CLOUDINARY_SIGNATURE
    })
});
```

## 🎯 Como Funciona

### 1. Verificação de Permissão
- O sistema verifica se o `user_id` do story é igual ao ID do usuário logado
- Apenas o criador pode ver o botão de exclusão

### 2. Processo de Exclusão
1. **Confirmação**: Usuário confirma a exclusão
2. **Verificação**: Sistema verifica permissão novamente
3. **Exclusão do Banco**: Remove registro da tabela `stories`
4. **Exclusão de Mídias**: Remove arquivos dos storages
5. **Atualização da UI**: Remove story da lista local

### 3. Storages Suportados
- **Cloudinary**: Exclusão via API (requer configuração)
- **Supabase Storage**: Exclusão automática
- **Outros**: Apenas log (não crítico)

## 🔒 Segurança

### Políticas RLS Implementadas
- **SELECT**: Apenas stories ativos são visíveis publicamente
- **INSERT**: Apenas usuários autenticados podem criar
- **UPDATE**: Apenas o criador pode atualizar
- **DELETE**: Apenas o criador pode excluir

### Verificações Duplas
- **Frontend**: Verifica permissão antes de mostrar botão
- **Backend**: Verifica permissão antes de executar exclusão
- **Banco**: Políticas RLS garantem segurança adicional

## 🎨 Interface

### Botão de Exclusão
- **Posição**: Canto superior direito
- **Visibilidade**: Apenas para o criador do story
- **Estilo**: Botão vermelho com ícone de lixeira
- **Confirmação**: Modal de confirmação antes da exclusão

### Estados
- **Normal**: Botão vermelho com ícone
- **Pressionado**: Opacidade reduzida
- **Carregando**: Indicador de progresso (futuro)

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Botão não aparece
- Verificar se o usuário está logado
- Verificar se o story tem `user_id` preenchido
- Verificar se o `user_id` corresponde ao usuário atual

#### 2. Erro ao excluir
- Verificar permissões RLS no banco
- Verificar se o story existe
- Verificar logs para detalhes do erro

#### 3. Mídias não são excluídas
- Para Cloudinary: Verificar configuração das credenciais
- Para Supabase: Verificar permissões do storage
- Erros de mídia não impedem exclusão do story

### Logs Úteis
```javascript
// Logs de debug disponíveis:
console.log('🗑️ StoryService: Iniciando exclusão do story:', storyId);
console.log('✅ Story encontrado, verificando mídias...');
console.log('✅ Mídias excluídas com sucesso');
console.log('✅ Story excluído com sucesso!');
```

## 📝 Notas Importantes

1. **Exclusão Permanente**: A exclusão não pode ser desfeita
2. **Mídias**: Erros na exclusão de mídias não impedem exclusão do story
3. **Performance**: Exclusão é assíncrona e pode levar alguns segundos
4. **Fallback**: Se não há mais stories, usuário é redirecionado

## 🔄 Próximos Passos

1. **Configurar Cloudinary**: Adicionar credenciais para exclusão automática
2. **Indicador de Progresso**: Adicionar loading durante exclusão
3. **Histórico**: Implementar log de exclusões (opcional)
4. **Bulk Delete**: Exclusão em lote (futuro)
