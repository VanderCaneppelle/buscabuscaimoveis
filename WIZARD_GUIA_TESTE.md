# 🧪 Guia de Teste - Wizard de Cadastro de Imóveis

## 🚀 Como Testar

### **1. Iniciar o App**

```bash
npm start
# ou
expo start
```

### **2. Navegar até "Criar Anúncio"**

- Ir para aba "Anunciar"
- OU clicar em qualquer botão "+" no app
- O Wizard deve abrir automaticamente

---

## ✅ **Checklist de Testes**

### **STEP 1: Tipo & Transação**

- [ ] Todos os 8 ícones aparecem corretamente
- [ ] Ao clicar, card fica destacado (borda amarela)
- [ ] Apenas 1 tipo pode ser selecionado por vez
- [ ] Cards de transação funcionam igual
- [ ] Não deixa avançar sem selecionar ambos
- [ ] Alert aparece se tentar avançar sem preencher

**Teste de Edge Cases:**

- Selecionar e deselecionar várias vezes
- Tentar avançar sem seleção

---

### **STEP 2: Título & Descrição**

- [ ] Campo de título recebe foco automaticamente
- [ ] Contador de caracteres funciona
- [ ] Fica amarelo quando perto do limite
- [ ] Dicas aparecem quando campos vazios
- [ ] Dicas somem quando começa a digitar
- [ ] Não deixa título com menos de 10 caracteres
- [ ] Descrição é opcional

**Teste de Edge Cases:**

- Digitar exatamente 10 caracteres no título
- Tentar 101 caracteres no título (deve limitar)
- Deixar descrição vazia (deve permitir)
- Digitar 1001 caracteres na descrição (deve limitar)

---

### **STEP 3: Localização**

- [ ] Campo de busca funciona
- [ ] Sugestões aparecem após 3 caracteres
- [ ] Loader aparece enquanto busca
- [ ] Lista de sugestões é clicável
- [ ] Ao selecionar, endereço preenche
- [ ] Card verde de confirmação aparece
- [ ] Botão "Alterar endereço" funciona
- [ ] Botão "Escolher no mapa" abre mapa
- [ ] Mini preview do mapa aparece (se tiver coordenadas)
- [ ] Não deixa avançar sem endereço

**Teste de Edge Cases:**

- Buscar "São Paulo" (deve ter muitos resultados)
- Buscar "xyzabc123" (não deve ter resultados)
- Clicar fora do teclado (deve fechar)
- Selecionar e depois alterar

---

### **STEP 4: Características**

- [ ] Botões +/- funcionam
- [ ] Não deixa ir abaixo de 0
- [ ] Não deixa passar de 20
- [ ] Botões ficam cinzas quando no limite
- [ ] Número central atualiza
- [ ] Campo de área aceita apenas números
- [ ] Campo de área aceita ponto decimal
- [ ] Ícones coloridos aparecem
- [ ] Todos os contadores funcionam independentemente

**Teste de Edge Cases:**

- Clicar - quando já está em 0
- Clicar + até chegar em 20
- Tentar digitar letras no campo de área
- Digitar "100.5" na área (deve aceitar)
- Deixar área vazia (deve permitir)

---

### **STEP 5: Preços**

- [ ] Campo de preço formata automaticamente para BRL
- [ ] Símbolo R$ aparece fixo
- [ ] Números grandes ficam legíveis
- [ ] Campo promocional é opcional
- [ ] Se preço promocional < preço: badge de desconto aparece
- [ ] Card de comparação aparece com desconto
- [ ] Porcentagem calculada corretamente
- [ ] Economia calculada corretamente
- [ ] Dica de especialista aparece
- [ ] Não deixa avançar sem preço principal

**Teste de Edge Cases:**

- Digitar "1000000" (deve formatar para R$ 10.000,00)
- Preço promocional maior que principal (não deve mostrar desconto)
- Preço promocional igual ao principal (não deve mostrar desconto)
- Deletar todo o preço (deve permitir)
- Preço muito baixo "50" (deve formatar R$ 0,50)

---

### **STEP 6: Construtora**

- [ ] Lista de construtoras carrega
- [ ] Busca filtra em tempo real
- [ ] Busca funciona por nome
- [ ] Busca funciona por cidade
- [ ] Contador de resultados atualiza
- [ ] Ao clicar, card verde de confirmação aparece
- [ ] Botão "Remover seleção" funciona
- [ ] Botão "Pular esta etapa" funciona
- [ ] Loading aparece enquanto carrega
- [ ] Empty state aparece se não tiver resultados

**Teste de Edge Cases:**

- Buscar "A" (deve ter muitos resultados)
- Buscar "XYZABC123" (deve mostrar "não encontrado")
- Selecionar e remover várias vezes
- Pular etapa (deve permitir)
- Voltar e selecionar depois

---

### **STEP 7: Mídias**

- [ ] Contador de limites aparece
- [ ] Botão "Adicionar" abre modal
- [ ] Modal tem 3 opções (Câmera/Galeria/Vídeo)
- [ ] Opção de vídeo desabilita se plano não permite
- [ ] Ao selecionar foto, grid atualiza
- [ ] Thumbnails aparecem
- [ ] Vídeos têm overlay com ícone play
- [ ] Botão X remove mídia
- [ ] Alert de confirmação antes de remover
- [ ] Limites do plano são respeitados
- [ ] Dicas de boas fotos aparecem
- [ ] Não deixa avançar sem pelo menos 1 foto

**Teste de Edge Cases:**

- Tentar adicionar mais fotos que o limite
- Adicionar e remover várias vezes
- Testar permissões negadas
- Selecionar múltiplas fotos de uma vez
- Vídeo muito grande (deve alertar se necessário)

---

### **STEP 8: Revisão**

- [ ] Todos os dados aparecem organizados
- [ ] Cards por seção funcionam
- [ ] Botões "Editar" em cada seção
- [ ] Ao clicar "Editar", volta para step correto
- [ ] Preview de fotos aparece (máx 4 + contador)
- [ ] Características em grid
- [ ] Preços formatados
- [ ] Endereço completo
- [ ] Botão "Publicar Anúncio" destaca
- [ ] Info sobre aprovação aparece

**Teste de Edge Cases:**

- Editar step 1, avançar novamente
- Editar múltiplos steps
- Verificar se dados não se perdem

---

### **NAVEGAÇÃO GERAL**

- [ ] Progress bar atualiza em cada step
- [ ] Texto "Passo X de 8" correto
- [ ] Botão "Voltar" funciona
- [ ] Botão "Continuar" funciona
- [ ] Animação smooth entre steps
- [ ] No step 1, "Voltar" pergunta se quer cancelar
- [ ] Footer sempre visível
- [ ] Botões responsivos

**Teste de Edge Cases:**

- Avançar e voltar várias vezes
- Voltar do step 1 (deve alertar)
- Avançar rápido clicando múltiplas vezes

---

### **SUBMISSÃO FINAL**

- [ ] Modal de progresso aparece
- [ ] Barra de progresso atualiza
- [ ] Porcentagem atualiza
- [ ] Upload de mídias funciona
- [ ] Anúncio é criado no banco
- [ ] Alert de sucesso aparece
- [ ] Volta para tela anterior
- [ ] Contador de anúncios incrementa

**Teste de Edge Cases:**

- Internet lenta (progresso deve ser visível)
- Erro no upload (deve mostrar erro)
- Tentar submeter com dados inválidos
- Cancelar durante upload (?)

---

### **VALIDAÇÕES DE PLANO**

- [ ] Plano Bronze: max 5 fotos, 0 vídeos
- [ ] Plano Prata: max 10 fotos, 1 vídeo
- [ ] Plano Ouro: max 15 fotos, 3 vídeos
- [ ] Alert quando tenta adicionar além do limite
- [ ] Modal mostra limites corretos
- [ ] Contador atualiza corretamente

**Teste de Edge Cases:**

- Usuário sem plano
- Plano expirado
- Limite de anúncios atingido

---

## 🐛 **Bugs Conhecidos a Testar**

### **Prioridade Alta**

1. [ ] Coordenadas do mapa salvam corretamente
2. [ ] Developer_id salva no banco
3. [ ] Formatação de preço não quebra
4. [ ] Upload de múltiplas fotos funciona
5. [ ] Validações não permitem pular obrigatórios

### **Prioridade Média**

1. [ ] Animações não travam em devices lentos
2. [ ] Teclado não sobrepõe campos
3. [ ] Scroll funciona em todos os steps
4. [ ] Modais fecham corretamente
5. [ ] Cache de construtoras funciona

### **Prioridade Baixa**

1. [ ] Textos não ultrapassam containers
2. [ ] Ícones carregam corretamente
3. [ ] Cores consistentes em todo o fluxo

---

## 📱 **Testar em Diferentes Dispositivos**

### **iOS**

- [ ] iPhone SE (tela pequena)
- [ ] iPhone 12/13 (tela média)
- [ ] iPhone 14 Pro Max (tela grande)

### **Android**

- [ ] Device pequeno (5.5")
- [ ] Device médio (6.1")
- [ ] Device grande (6.7"+)

### **Orientações**

- [ ] Portrait (principal)
- [ ] Landscape (deve funcionar)

---

## 🎯 **Cenários de Teste Completos**

### **Cenário 1: Fluxo Feliz**

1. Abrir wizard
2. Selecionar "Apartamento" + "Venda"
3. Título: "Apartamento 3 quartos com vista mar"
4. Descrição: "Linda vista, reformado..."
5. Buscar e selecionar endereço
6. 3 quartos, 2 banheiros, 2 vagas, 120m²
7. Preço: R$ 500.000,00
8. Selecionar construtora (opcional)
9. Adicionar 5 fotos
10. Revisar
11. Publicar
12. ✅ Sucesso

### **Cenário 2: Mudar de Ideia**

1. Começar cadastro
2. Selecionar "Casa"
3. Avançar 3 steps
4. Voltar para step 1
5. Mudar para "Apartamento"
6. Continuar normalmente
7. ✅ Dados devem persistir

### **Cenário 3: Pular Opcionais**

1. Preencher apenas obrigatórios
2. Pular descrição
3. Pular área
4. Pular construtora
5. Apenas 1 foto
6. Publicar
7. ✅ Deve funcionar

### **Cenário 4: Limite de Plano**

1. Usuário com plano Bronze
2. Tentar adicionar 6ª foto
3. ✅ Deve alertar e bloquear

### **Cenário 5: Cancelamento**

1. Preencher até step 5
2. Pressionar voltar no step 1
3. Confirmar cancelamento
4. ✅ Deve voltar sem salvar

---

## 📊 **Métricas de Sucesso**

- [ ] Formulário completo em < 2 minutos
- [ ] Zero travamentos
- [ ] Animações a 60fps
- [ ] Validações claras
- [ ] UX intuitiva (sem dúvidas)

---

## 🔧 **Debug Tips**

### **Ver Logs**

Console mostra:

- "Rendered CreateAdScreen"
- "✅ Construtoras carregadas: X"
- "✅ Anúncio criado!"
- Etc.

### **Estado do Formulário**

Adicionar console.log em `updateFormData` para ver mudanças

### **Upload Progress**

Ver porcentagem no modal

### **Network**

Ver requisições no React Native Debugger

---

## ✅ **Checklist Pós-Teste**

Antes de marcar como concluído:

- [ ] Todos os steps testados
- [ ] Validações funcionando
- [ ] Animações smooth
- [ ] Upload funciona
- [ ] Dados salvam corretamente
- [ ] Sem crashes
- [ ] Sem erros de lint
- [ ] Testado em iOS e Android
- [ ] UX aprovada

---

## 🆘 **Problemas Comuns**

### **"Construtoras não carregam"**

- Verificar se SQL foi executado
- Verificar se dados foram importados
- Checar console por erros

### **"Mapa não aparece"**

- Verificar API key do Google Maps
- Checar permissões de localização

### **"Upload trava"**

- Verificar tamanho das fotos
- Checar conexão com internet
- Ver logs do backend

### **"Validação não funciona"**

- Verificar lógica em `validateStep()`
- Adicionar console.logs

---

**Boa sorte nos testes!** 🚀

Se encontrar bugs, documente:

- Step onde ocorreu
- O que fez
- O que esperava
- O que aconteceu
- Screenshots/vídeo se possível
