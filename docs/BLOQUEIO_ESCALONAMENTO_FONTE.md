# 🔒 Bloqueio de Escalonamento de Fonte

## 📋 Problema

Quando o usuário tem configurações de acessibilidade no sistema operacional que
aumentam o tamanho da fonte, o React Native automaticamente escala todos os
componentes `Text` e `TextInput`, o que pode quebrar o layout do app.

## ✅ Solução Implementada

Criamos componentes customizados que desabilitam o escalonamento de fonte do
sistema:

- **`AppText`** - Substitui `Text` do React Native
- **`AppTextInput`** - Substitui `TextInput` do React Native

Ambos os componentes têm `allowFontScaling={false}` configurado por padrão.

## 📁 Arquivos Criados

1. **`components/AppText.js`** - Componente Text customizado
2. **`components/AppTextInput.js`** - Componente TextInput customizado
3. **`scripts/replace-text-components.js`** - Script para substituição
   automática (opcional)

## 🔧 Como Usar

### Importação

```javascript
// ❌ ANTES
import { Text, TextInput } from "react-native";

// ✅ DEPOIS
import AppText from "./components/AppText";
import AppTextInput from "./components/AppTextInput";
```

### Uso nos Componentes

```javascript
// ❌ ANTES
<Text style={styles.title}>Título</Text>
<TextInput 
  style={styles.input}
  value={value}
  onChangeText={onChangeText}
/>

// ✅ DEPOIS
<AppText style={styles.title}>Título</AppText>
<AppTextInput 
  style={styles.input}
  value={value}
  onChangeText={onChangeText}
/>
```

## 📝 Arquivos Já Atualizados

- ✅ `App.js`
- ✅ `components/StandardHeader.js`
- ✅ `components/LoginScreen.js`
- ✅ `components/SignUpForm.js`
- ✅ `components/CreateAdWizard.js`
- ✅ `components/HomeScreen.js`
- ✅ `components/PropertyDetailsScreen.js`

## 🚀 Próximos Passos

### Opção 1: Substituição Manual (Recomendado)

Substitua gradualmente `Text` e `TextInput` pelos componentes customizados nos
arquivos restantes:

1. **Arquivos ainda pendentes:**
   - Todos os arquivos em `components/wizard/steps/`
   - Outros componentes que ainda usam `Text` ou `TextInput` do React Native

2. **Processo:**
   - Adicione os imports: `import AppText from './AppText';` e
     `import AppTextInput from './AppTextInput';`
   - Remova `Text` e `TextInput` dos imports do `react-native`
   - Substitua `<Text` por `<AppText` e `</Text>` por `</AppText>`
   - Substitua `<TextInput` por `<AppTextInput` e `</TextInput>` por
     `</AppTextInput>`

### Opção 2: Script Automático (Cuidado!)

O script `scripts/replace-text-components.js` pode fazer a substituição
automaticamente, mas **requer revisão manual**:

```bash
node scripts/replace-text-components.js
```

⚠️ **IMPORTANTE:** Sempre revise os arquivos modificados pelo script antes de
commitar!

## 🎯 Benefícios

- ✅ Layout consistente independente das configurações do sistema
- ✅ Melhor controle sobre o design
- ✅ Solução profissional e escalável
- ✅ Fácil de manter (componentes centralizados)

## ⚠️ Considerações

- Esta solução **desabilita o escalonamento de fonte**, o que pode afetar a
  acessibilidade para usuários que realmente precisam de fontes maiores
- Se necessário, você pode criar uma versão alternativa que permite
  escalonamento em casos específicos
- Para melhor acessibilidade, considere implementar um sistema de temas com
  tamanhos de fonte pré-definidos

## 📚 Referências

- [React Native Text - allowFontScaling](https://reactnative.dev/docs/text#allowfontscaling)
- [React Native TextInput - allowFontScaling](https://reactnative.dev/docs/textinput#allowfontscaling)
