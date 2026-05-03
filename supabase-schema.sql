-- Execute este SQL no SQL Editor do seu projeto Supabase
-- https://supabase.com → SQL Editor → New query

CREATE TABLE IF NOT EXISTS bookings (
  id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  services      jsonb        NOT NULL,
  date          text         NOT NULL,
  date_key      text         NOT NULL,
  time_slot     integer      NOT NULL,
  total_duration integer     NOT NULL,
  total_price   integer      NOT NULL,
  client_name   text         NOT NULL,
  client_phone  text         NOT NULL,
  client_email  text,
  client_notes  text,
  status        text         DEFAULT 'confirmed',
  created_at    timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date_key ON bookings(date_key);
CREATE INDEX IF NOT EXISTS idx_bookings_status   ON bookings(status);

-- Habilitar Row Level Security e permitir acesso público (anon)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON bookings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON bookings FOR UPDATE TO anon USING (true);
