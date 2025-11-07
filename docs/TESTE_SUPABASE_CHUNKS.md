# 🧪 Guia de Teste: Supabase Upload com Chunks

## ✅ O Que Foi Implementado

Criei **3 novas funções de teste** sem remover nada do código do Cloudinary:

### 1. `uploadToSupabaseWithChunks()` ⭐ Nova!
Upload inteligente que decide automaticamente:
- **<100MB**: Upload direto (mais rápido)
- **>100MB**: Upload em chunks de 5MB (mais estável)

### 2. `uploadStoryTest()` ⭐ Nova!
Versão de teste do `uploadStory` que usa a nova função com chunks.

### 3. Atualizações
- ✅ Limite atualizado: 200MB → **500MB**
- ✅ Retry automático: 3 tentativas por chunk
- ✅ Logs detalhados para debug
- ✅ Progress callback funcional

---

## 📋 Mudanças no Código

### Arquivo: `lib/mediaServiceOptimized.js`

**Linhas 592-754**: Nova função `uploadToSupabaseWithChunks`
- Upload inteligente com decisão automática
- Chunks de 5MB para arquivos >100MB
- Retry automático (3 tentativas)
- Progress tracking completo

**Linhas 1018-1102**: Nova função `uploadStoryTest`
- Versão de teste para stories
- Usa `uploadToSupabaseWithChunks` internamente
- Identificador `method: 'supabase_chunked'` no retorno

**Limites atualizados:**
- Linha 966: `maxSize = 500 * 1024 * 1024` (stories)
- Linha 768: `maxSize = 500 * 1024 * 1024` (múltiplos arquivos)

---

## 🚀 Como Testar

### Opção 1: Teste Direto na Criação de Story

No arquivo onde você cria stories (provavelmente `CreateStoryScreen.js` ou similar):

```javascript
import { MediaServiceOptimized } from './lib/mediaServiceOptimized';

// Em vez de usar uploadStory(), use uploadStoryTest()
const handleUpload = async (videoUri) => {
  try {
    console.log('🧪 INICIANDO TESTE COM SUPABASE...');
    
    // Usar função de teste
    const result = await MediaServiceOptimized.uploadStoryTest(
      videoUri,
      'Meu Story Teste',
      'video',
      null, // linkData
      null, // titlePosition
      null, // titleCoordinates
      null, // titleLayout
      null, // titleScale
      null, // linkScale
      user?.id, // userId
      (progress) => {
        console.log(`📊 Progresso: ${progress}%`);
        setUploadProgress(progress);
      }
    );
    
    console.log('✅ TESTE CONCLUÍDO:', result);
    console.log('🎯 Método usado:', result.method); // 'supabase_chunked'
    console.log('🔗 URL:', result.publicUrl);
    
  } catch (error) {
    console.error('❌ TESTE FALHOU:', error);
  }
};
```

### Opção 2: Teste Isolado (Recomendado)

Crie um arquivo de teste temporário:

```javascript
// teste-supabase.js (criar na raiz)
import { MediaServiceOptimized } from './lib/mediaServiceOptimized';

export async function testarSupabaseUpload(videoUri) {
  console.log('═══════════════════════════════════════');
  console.log('🧪 TESTE: Upload Supabase com Chunks');
  console.log('═══════════════════════════════════════');
  
  try {
    // Informações do arquivo
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    const sizeMB = fileInfo.size / (1024 * 1024);
    
    console.log(`📦 Tamanho: ${sizeMB.toFixed(2)}MB`);
    console.log(`🎯 Método esperado: ${sizeMB > 100 ? 'CHUNKED' : 'DIRECT'}`);
    console.log('');
    
    // Upload de teste
    const startTime = Date.now();
    
    const result = await MediaServiceOptimized.uploadStoryTest(
      videoUri,
      `Teste ${Date.now()}`,
      'video',
      null, null, null, null, null, null, null,
      (progress) => {
        console.log(`📊 ${progress}%`);
      }
    );
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════');
    console.log(`⏱️ Duração: ${duration.toFixed(2)}s`);
    console.log(`🔗 URL: ${result.publicUrl}`);
    console.log(`🎯 Método: ${result.method}`);
    console.log(`🆔 Order Index: ${result.orderIndex}`);
    
    return result;
    
  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('❌ TESTE FALHOU!');
    console.log('═══════════════════════════════════════');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}
```

---

## 📝 Cenários de Teste

### Teste 1: Vídeo Pequeno (<100MB)
**Objetivo**: Verificar upload direto

```javascript
// Vídeo de 50MB
const result = await testarSupabaseUpload(smallVideoUri);

// Logs esperados:
// 📦 Tamanho: 50.23MB
// 🎯 Método esperado: DIRECT
// 📤 Iniciando upload direto...
// ✅ Upload direto concluído
// ✅ TESTE CONCLUÍDO COM SUCESSO!
```

### Teste 2: Vídeo Grande (>100MB)
**Objetivo**: Verificar upload em chunks

```javascript
// Vídeo de 200MB
const result = await testarSupabaseUpload(largeVideoUri);

// Logs esperados:
// 📦 Tamanho: 200.45MB
// 🎯 Método esperado: CHUNKED
// 🔄 Iniciando upload em chunks...
// 📦 Total de chunks: 41
// 1️⃣ Criando arquivo inicial...
// ✅ Arquivo inicial criado
// 📤 Chunk 1/41 (5.00MB)
// ✅ Chunk 1/41 enviado com sucesso
// ... (repeat for all chunks)
// ✅ Todos os chunks enviados com sucesso!
// ✅ TESTE CONCLUÍDO COM SUCESSO!
```

### Teste 3: Vídeo Muito Grande (300-400MB)
**Objetivo**: Verificar se consegue enviar arquivos grandes

```javascript
// Vídeo de 350MB
const result = await testarSupabaseUpload(veryLargeVideoUri);

// Logs esperados:
// 📦 Tamanho: 350.78MB
// 🎯 Método esperado: CHUNKED
// 📦 Total de chunks: 71
// ... (processo completo de chunks)
```

### Teste 4: Retry em Caso de Falha
**Objetivo**: Verificar retry automático

```javascript
// Se um chunk falhar, verá:
// ⚠️ Erro no chunk 15, tentativas restantes: 2
// (aguarda 2s)
// ⚠️ Erro no chunk 15, tentativas restantes: 1
// (aguarda 2s)
// ✅ Chunk 15/71 enviado com sucesso
```

---

## 🔍 O Que Observar nos Logs

### Logs de Sucesso ✅

```
🧪 [TESTE SUPABASE] Iniciando upload de story...
🔍 Tipo detectado: video
📦 Tamanho: 200.45MB
🧪 [TESTE] Upload para Supabase com chunks automáticos
📁 Bucket: stories
📂 Folder: stories
📦 Tamanho do arquivo: 200.45MB
📊 Método escolhido: CHUNKED UPLOAD
🔄 Iniciando upload em chunks...
📦 Total de chunks: 41
1️⃣ Criando arquivo inicial...
✅ Arquivo inicial criado
📤 Chunk 1/41 (5.00MB)
✅ Chunk 1/41 enviado com sucesso
📤 [TESTE] Progresso: 2%
...
✅ Todos os chunks enviados com sucesso!
✅ Upload finalizado com sucesso!
🔗 URL: https://xxx.supabase.co/storage/v1/object/public/stories/...
✅ [TESTE] Vídeo enviado: https://...
```

### Logs de Erro a Investigar ❌

**Erro 1: Chunks não são montados**
```
❌ Erro ao criar arquivo inicial: {error details}
ou
❌ Falha no chunk X após 3 tentativas: {error details}
```

**Solução**: Este é o problema que você teve antes. Se acontecer:
1. Anote qual chunk falhou
2. Anote o tamanho do arquivo
3. Vamos ajustar a estratégia

**Erro 2: Limite de tamanho**
```
❌ Arquivo muito grande. Máximo: 500MB. Tamanho: 550.23MB
```

**Solução**: Arquivo excede limite do Supabase (500MB configurado).

**Erro 3: Timeout**
```
❌ Network request timeout
```

**Solução**: Internet instável. O retry automático deveria resolver, mas se persistir, aumentar timeout.

---

## 📊 Comparação: Cloudinary vs Supabase (após teste)

Preencha após os testes:

| Aspecto | Cloudinary | Supabase (Teste) |
|---------|-----------|------------------|
| Upload 50MB | ⏱️ __s | ⏱️ __s |
| Upload 200MB | ⏱️ __s | ⏱️ __s |
| Upload 400MB | ⏱️ __s | ⏱️ __s |
| Falhas | __ | __ |
| Chunks montados | ✅ | ? |
| Facilidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Próximos Passos

### Se Funcionar ✅
1. Testar com diferentes tamanhos (50MB, 100MB, 200MB, 400MB)
2. Testar em iOS e Android
3. Testar em rede 4G/5G/WiFi
4. Se tudo OK: Remover código Cloudinary gradualmente

### Se Não Funcionar ❌
1. Anotar em qual tamanho falhou
2. Anotar erro específico
3. Verificar se chunks foram criados no Supabase Storage
4. Podemos tentar:
   - Ajustar tamanho dos chunks (5MB → 10MB ou 2MB)
   - Mudar estratégia (TUS protocol?)
   - Migrar para Bunny.net conforme análise anterior

---

## 🐛 Troubleshooting

### Problema: "Falha ao criar arquivo inicial"
**Causa**: Bucket não existe ou sem permissões
**Solução**:
```sql
-- Verificar no Supabase SQL Editor
SELECT * FROM storage.buckets WHERE name = 'stories';

-- Se não existir, criar:
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true);
```

### Problema: "Chunks não são montados"
**Causa**: Supabase Storage não junta os chunks
**Solução**: Infelizmente é limitação do Supabase. Neste caso:
1. ❌ Confirmar que Supabase não funciona para você
2. ✅ Migrar para Bunny.net (análise já está pronta!)

### Problema: Progresso não atualiza
**Causa**: Callback não está sendo passado
**Solução**: Verificar se `onProgress` está sendo passado corretamente

---

## 📞 Como Reportar Resultados

Envie estas informações:

```
📊 RESULTADO DO TESTE

✅ FUNCIONOU ou ❌ FALHOU

Detalhes:
- Tamanho do arquivo: ___ MB
- Método usado: CHUNKED ou DIRECT
- Tempo total: ___ segundos
- Sistema: iOS ou Android
- Rede: WiFi/4G/5G

Logs importantes:
[Cole os logs relevantes aqui]

URL gerada (se sucesso):
https://...

Erro (se falhou):
[Cole o erro aqui]
```

---

## 🎉 Se Funcionar!

Parabéns! Você economizará **~$90/mês** mantendo o Supabase:

- Cloudinary Plus: $99/mês
- Supabase Pro: $25/mês (que você já paga)
- **Economia: $74-90/mês!**

E ainda terá:
- ✅ Upload até 500MB
- ✅ CDN global
- ✅ Chunks estáveis
- ✅ Integração nativa com seu stack

---

**Pronto para testar? Boa sorte! 🚀**

