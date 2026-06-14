-- Execute este SQL no SQL Editor do seu projeto Supabase
-- https://supabase.com → SQL Editor → New query

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA PRINCIPAL
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id               uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  services         jsonb        NOT NULL,
  date             text         NOT NULL,
  date_key         text         NOT NULL,
  time_slot        integer      NOT NULL,
  total_duration   integer      NOT NULL,
  total_price      integer      NOT NULL,
  client_name      text         NOT NULL,
  client_phone     text         NOT NULL,
  client_email     text,
  client_notes     text,
  client_birthdate text,
  professional_name text,
  status           text         DEFAULT 'confirmed',
  created_at       timestamptz  DEFAULT now()
);

-- Adiciona colunas caso a tabela já exista sem elas
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_birthdate  text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS professional_name text;

-- ─────────────────────────────────────────────────────────────
-- 2. ÍNDICES para queries frequentes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_date_key       ON bookings(date_key);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_professional   ON bookings(professional_name);
CREATE INDEX IF NOT EXISTS idx_bookings_client_phone   ON bookings(client_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at     ON bookings(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select" ON bookings;
DROP POLICY IF EXISTS "anon_insert" ON bookings;
DROP POLICY IF EXISTS "anon_update" ON bookings;
DROP POLICY IF EXISTS "anon_delete" ON bookings;

CREATE POLICY "anon_select" ON bookings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON bookings FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete" ON bookings FOR DELETE TO anon USING (true);

-- ─────────────────────────────────────────────────────────────
-- 4. SUPABASE REALTIME
-- Habilita sincronização em tempo real da tabela bookings.
-- Após executar, verifique em: Supabase → Database → Replication
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- ─────────────────────────────────────────────────────────────
-- 5. STATUS VÁLIDOS (constraint opcional para integridade)
-- confirmed = agendado
-- attended  = cliente compareceu e foi atendido
-- no_show   = cliente não compareceu
-- cancelled = cancelado
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
--   CHECK (status IN ('confirmed', 'attended', 'no_show', 'cancelled'));
