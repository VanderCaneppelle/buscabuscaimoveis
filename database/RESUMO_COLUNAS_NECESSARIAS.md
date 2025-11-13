# 📋 RESUMO: Colunas Necessárias para `get_boosted_properties()`

## 🔍 De onde a função pega os dados:

A função `get_boosted_properties()` faz um **INNER JOIN** entre duas tabelas:

- **`properties`** (alias `p`) - Tabela principal de imóveis
- **`property_boosts`** (alias `pb`) - Tabela de impulsionamentos

---

## 📊 TABELA `properties` - Colunas Necessárias:

### ✅ Colunas que JÁ EXISTEM (da função original):

- `id` → UUID
- `title` → TEXT
- `description` → TEXT
- `price` → DECIMAL(10,2)
- `sale_price` → DECIMAL(10,2)
- `property_type` → TEXT
- `transaction_type` → TEXT
- `bedrooms` → INTEGER
- `bathrooms` → INTEGER
- `parking_spaces` → INTEGER
- `area` → DECIMAL(10,2)
- `address` → TEXT
- `neighborhood` → TEXT
- `city` → TEXT
- `state` → TEXT
- `zip_code` → TEXT
- `latitude` → DECIMAL(10,8)
- `longitude` → DECIMAL(11,8)
- `images` → TEXT[]
- `status` → TEXT
- `views` → INTEGER
- `created_at` → TIMESTAMP WITH TIME ZONE
- `user_id` → UUID

### ⚠️ Colunas NOVAS que precisam existir (adicionadas agora):

- `video_urls` → TEXT[] (array de URLs de vídeos)
- `promotional_price` → DECIMAL(10,2) (preço promocional)
- `promo_price` → DECIMAL(10,2) (preço promocional alternativo)
- `construction_year` → INTEGER (ano de construção)
- `floor` → TEXT (andar do imóvel)
- `condominium_fee` → DECIMAL(10,2) (taxa de condomínio)

---

## 📊 TABELA `property_boosts` - Colunas Necessárias:

### ✅ Colunas que JÁ EXISTEM:

- `id` → UUID
- `property_id` → UUID (FK para properties.id)
- `end_date` → TIMESTAMP WITH TIME ZONE
- `created_at` → TIMESTAMP WITH TIME ZONE (usado no ORDER BY)

---

## 🔍 Verificação SQL para conferir se as colunas existem:

Execute este SQL no Supabase para verificar se todas as colunas existem:

```sql
-- Verificar colunas da tabela properties
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'properties'
AND column_name IN (
    'video_urls',
    'promotional_price',
    'promo_price',
    'construction_year',
    'floor',
    'condominium_fee'
)
ORDER BY column_name;
```

---

## ⚠️ Se alguma coluna não existir:

Se alguma das colunas novas não existir na tabela `properties`, você precisará
criá-las. Exemplo:

```sql
-- Adicionar colunas faltantes (se necessário)
ALTER TABLE properties 
    ADD COLUMN IF NOT EXISTS video_urls TEXT[],
    ADD COLUMN IF NOT EXISTS promotional_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS construction_year INTEGER,
    ADD COLUMN IF NOT EXISTS floor TEXT,
    ADD COLUMN IF NOT EXISTS condominium_fee DECIMAL(10,2);
```

---

## 📝 Observações:

1. **`video_urls`**: A função usa `COALESCE(p.video_urls, ARRAY[]::TEXT[])` para
   garantir que sempre retorne um array (mesmo que vazio).

2. **`promotional_price` e `promo_price`**: A função usa
   `COALESCE(p.promotional_price, NULL)` e `COALESCE(p.promo_price, NULL)` para
   retornar NULL se não existir.

3. **Campos calculados**:
   - `days_remaining` é calculado:
     `GREATEST(0, EXTRACT(DAY FROM (pb.end_date - NOW()))::INTEGER)`
   - `property_status` vem de `p.status`
   - `property_views` vem de `p.views`
   - `property_created_at` vem de `p.created_at`
