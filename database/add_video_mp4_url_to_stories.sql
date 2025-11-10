-- Adicionar coluna para armazenar URL MP4 gerado pela Bunny
ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS video_mp4_url TEXT;

