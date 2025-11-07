-- Atualizar constraint de status na tabela stories
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_status_check;
ALTER TABLE stories
    ADD CONSTRAINT stories_status_check
    CHECK (status = ANY (ARRAY['active', 'inactive', 'processing']::text[]));
