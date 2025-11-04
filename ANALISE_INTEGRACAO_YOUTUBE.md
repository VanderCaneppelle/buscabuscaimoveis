# 📹 Análise: Integração de Vídeos do YouTube nos Anúncios

## 🎯 Como o Zap Imóveis Faz

### Processo do Usuário:

1. **Publica o vídeo no YouTube** (precisa ser público, não pode ser "Shorts")
2. **Copia o link** do vídeo do YouTube
3. **Cola o link** no campo de vídeo ao criar/editar o anúncio no Zap Imóveis
4. O sistema **automaticamente detecta** que é um link do YouTube e exibe o
   vídeo embedado

### Vantagens:

- ✅ **Muito mais barato**: Não usa armazenamento próprio (Cloudinary/Supabase)
- ✅ **Não consome cota de upload**: O YouTube hospeda o vídeo
- ✅ **Sem limite de tamanho**: YouTube permite vídeos longos
- ✅ **Qualidade**: YouTube faz otimização automática
- ✅ **Compartilhável**: Usuário pode reutilizar o mesmo vídeo em outros lugares

### Requisitos:

- Vídeo deve ser **público** (não privado)
- **Não pode ser YouTube Shorts** (formato vertical curto)
- **Duração recomendada**: mais de 3 minutos para melhor apresentação

---

## 🔍 Situação Atual do Seu Sistema

### Como funciona hoje:

```60:66:components/PropertyDetailsScreen.js
const isVideoFile = useCallback((url) => {
    return url.includes('.mp4') ||
        url.includes('.mov') ||
        url.includes('.avi') ||
        url.includes('.mkv') ||
        url.includes('.webm');
}, []);
```

- ✅ Suporta **vídeos locais** (MP4, MOV, AVI, etc)
- ✅ Faz upload para **Cloudinary** (armazenamento próprio)
- ✅ Consome **cota de armazenamento** e **banda**
- ❌ **Não suporta links do YouTube**

### Estrutura atual no banco:

```41:69:database/schema.sql
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    property_type TEXT NOT NULL, -- 'casa', 'apartamento', 'terreno', 'comercial'
    transaction_type TEXT NOT NULL, -- 'venda', 'aluguel'
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER,
    area DECIMAL(8,2), -- em m²
    address TEXT NOT NULL,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    images TEXT[], -- URLs das imagens
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'inactive'
    admin_notes TEXT, -- Notas do administrador
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Observação**: O campo `images` é um array de URLs, então pode armazenar tanto
URLs de imagens quanto URLs de vídeos (incluindo links do YouTube).

---

## 💡 O que Precisa Fazer para Implementar

### 1. **Detectar URLs do YouTube** ✅ (Fácil)

Adicionar função para identificar links do YouTube:

- `youtube.com/watch?v=...`
- `youtu.be/...`
- `youtube.com/embed/...`

### 2. **Extrair ID do Vídeo** ✅ (Fácil)

Converter URLs do YouTube para formato de embed:

- `https://www.youtube.com/watch?v=VIDEO_ID` →
  `https://www.youtube.com/embed/VIDEO_ID`

### 3. **Exibir Vídeo Embedado** ⚠️ (Médio)

No React Native, precisa usar:

- **WebView** para embed do YouTube
- Ou biblioteca como `react-native-youtube-iframe`
- Ou abrir o YouTube no navegador

### 4. **Atualizar Interface de Upload** ✅ (Fácil)

Adicionar campo opcional para colar link do YouTube além do upload de arquivo.

---

## 🚀 Implementação Sugerida

### Passo 1: Função para Detectar YouTube

```javascript
const isYouTubeUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    return url.includes("youtube.com") || url.includes("youtu.be");
};

const extractYouTubeVideoId = (url) => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
};
```

### Passo 2: Atualizar Função de Detecção de Vídeo

```javascript
const isVideoFile = useCallback((url) => {
    // Verificar se é link do YouTube primeiro
    if (isYouTubeUrl(url)) return true;

    // Depois verificar extensões de arquivo
    return url.includes(".mp4") ||
        url.includes(".mov") ||
        url.includes(".avi") ||
        url.includes(".mkv") ||
        url.includes(".webm");
}, []);
```

### Passo 3: Componente para Exibir YouTube

```javascript
import { WebView } from "react-native-webview";
// ou
import YoutubePlayer from "react-native-youtube-iframe";

const renderVideo = (url) => {
    if (isYouTubeUrl(url)) {
        const embedUrl = getYouTubeEmbedUrl(url);
        return (
            <WebView
                source={{ uri: embedUrl }}
                style={{ width: "100%", height: 200 }}
            />
        );
    } else {
        // Vídeo local (código atual)
        return (
            <Video
                source={{ uri: url }}
                style={styles.video}
                useNativeControls={true}
            />
        );
    }
};
```

### Passo 4: Adicionar Campo no Formulário

No `Step8Media.js`, adicionar opção para colar link do YouTube:

- Campo de texto para URL
- Botão "Adicionar do YouTube"
- Validação do link antes de adicionar

---

## 📊 Comparação: Upload vs YouTube

| Aspecto           | Upload Local          | YouTube               |
| ----------------- | --------------------- | --------------------- |
| **Custo**         | 💰 Alto (Cloudinary)  | ✅ Grátis             |
| **Armazenamento** | ❌ Consome cota       | ✅ Ilimitado          |
| **Banda**         | ❌ Consome banda      | ✅ YouTube serve      |
| **Qualidade**     | ⚠️ Depende do upload  | ✅ YouTube otimiza    |
| **Controle**      | ✅ Total              | ⚠️ Depende do YouTube |
| **Velocidade**    | ⚠️ Upload lento       | ✅ Link instantâneo   |
| **Limite**        | ❌ Limitado por plano | ✅ Sem limite         |

---

## ✅ Recomendação

**Implementar suporte a YouTube é MUITO vantajoso porque:**

1. 💰 **Reduz custos drasticamente** (não precisa armazenar vídeos)
2. 🚀 **Melhora UX** (upload mais rápido, só colar link)
3. 📈 **Permite vídeos mais longos** (sem limite de tamanho)
4. 🎯 **Mesma experiência do Zap** (padrão do mercado)

**Sugestão**: Permitir **ambos** (upload local E link do YouTube), dando ao
usuário a escolha.

---

## 🔧 Próximos Passos

1. ✅ Adicionar funções de detecção de YouTube
2. ✅ Criar componente para exibir YouTube embed
3. ✅ Atualizar interface de upload para aceitar links
4. ✅ Testar com diferentes formatos de URL do YouTube
5. ✅ Validar que vídeo é público (opcional, mas recomendado)

---

## 📝 Notas Importantes

- **YouTube Shorts**: Não funciona no embed tradicional, precisa detectar e
  mostrar mensagem
- **Vídeos privados**: Não funcionarão, mas difícil validar sem API do YouTube
- **Mobile**: React Native WebView pode ter limitações, testar bem
- **Fallback**: Se YouTube não carregar, mostrar link para abrir no app/browser

---

**Data da Análise**: 2024 **Status**: Pronto para implementação
