# Seleção de Múltiplas Imagens

## Funcionalidades Disponíveis

### 1. Seleção de Múltiplas Imagens (`pickImage`)
A função `pickImage` agora permite selecionar múltiplas imagens de uma vez.

```javascript
import { MediaServiceOptimized } from '../lib/mediaServiceOptimized';

// Selecionar múltiplas imagens
const images = await MediaServiceOptimized.pickImage();

// images será um array de objetos:
// [
//   {
//     uri: "file://...",
//     type: "image",
//     fileName: "image_1234567890_0.jpg",
//     fileSize: 1024000
//   },
//   {
//     uri: "file://...",
//     type: "image", 
//     fileName: "image_1234567890_1.jpg",
//     fileSize: 2048000
//   }
// ]
```

### 2. Seleção de Imagem Única (`pickSingleImage`)
Para casos onde você precisa de apenas uma imagem com edição:

```javascript
// Selecionar uma única imagem com edição
const image = await MediaServiceOptimized.pickSingleImage();

// image será um objeto único ou null:
// {
//   uri: "file://...",
//   type: "image",
//   fileName: "image_1234567890.jpg",
//   fileSize: 1024000
// }
```

## Exemplo de Uso no CreateAdScreen

O `CreateAdScreen` já foi atualizado para lidar com múltiplas imagens:

```javascript
const handleAddMedia = async (type) => {
    try {
        let result;
        
        if (type === 'gallery') {
            result = await MediaServiceOptimized.pickImage();
        }
        
        if (result) {
            // Se result for um array (múltiplas imagens), processar cada uma
            const results = Array.isArray(result) ? result : [result];
            
            for (const mediaResult of results) {
                // Processar cada imagem individualmente
                // Verificar tamanho, adicionar à lista, etc.
            }
        }
    } catch (error) {
        console.error('Erro ao adicionar mídia:', error);
    }
};
```

## Configurações Disponíveis

### Opções para `pickImage`:
- `allowsMultipleSelection: true` (padrão)
- `allowsEditing: false` (desabilitado para múltiplas imagens)
- `quality: 0.7` (qualidade reduzida para economizar memória)
- `mediaTypes: ['images']`

### Opções para `pickSingleImage`:
- `allowsMultipleSelection: false`
- `allowsEditing: true` (habilitado para edição)
- `aspect: [4, 3]` (proporção fixa)
- `quality: 0.7`

## Benefícios

1. **Melhor UX**: Usuários podem selecionar várias fotos de uma vez
2. **Performance**: Qualidade otimizada para economizar memória
3. **Flexibilidade**: Duas funções para diferentes casos de uso
4. **Compatibilidade**: Código existente continua funcionando

## Notas Importantes

- A edição de imagem está desabilitada para seleção múltipla
- Cada imagem é processada individualmente para validação de tamanho
- Arquivos muito grandes (>50MB) são automaticamente rejeitados
- Arquivos grandes (>25MB) mostram aviso mas são permitidos
