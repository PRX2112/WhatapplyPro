-- Whatapply Production Schema
-- Multi-tenant WhatsApp SaaS Platform

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- BUSINESSES (Tenant root)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  type            TEXT NOT NULL DEFAULT 'general',
  -- salon, restaurant, gym, clinic, shop, freelancer, general
  upi_id          TEXT,
  wa_phone_id     TEXT,
  wa_access_token TEXT,
  wa_waba_id      TEXT,
  wa_mode         TEXT NOT NULL DEFAULT 'sandbox',
  timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- USERS (Authentication, linked to one business)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner',
  -- owner, admin, staff
  has_seen_guide BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS (Per-business contacts / clients)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  upi_id       TEXT,
  note         TEXT,
  tags         TEXT[]       DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- ─────────────────────────────────────────────────────────────
-- SERVICES (Generic service catalog, per business)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_min INTEGER       NOT NULL DEFAULT 30,
  category     TEXT,
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- BOOKINGS (Appointments / Reservations / Sessions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  customer_name   TEXT         NOT NULL,
  customer_phone  TEXT         NOT NULL,
  service_name    TEXT         NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  date_time       TIMESTAMPTZ  NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'pending',
  -- pending, confirmed, completed, cancelled
  notes           TEXT,
  staff_name      TEXT,
  is_deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- LEDGER ENTRIES (Debit/Credit transaction history)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type         TEXT         NOT NULL,
  -- 'debit' (customer owes), 'credit' (customer paid)
  amount       NUMERIC(10,2) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- WA TEMPLATES (WhatsApp message templates)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'UTILITY',
  -- UTILITY, MARKETING, AUTHENTICATION
  language     TEXT    NOT NULL DEFAULT 'en',
  body_text    TEXT    NOT NULL,
  placeholders TEXT[]  DEFAULT '{}',
  status       TEXT    NOT NULL DEFAULT 'APPROVED',
  -- APPROVED, PENDING, REJECTED
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGNS (Broadcast campaign records)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES wa_templates(id) ON DELETE SET NULL,
  name             TEXT    NOT NULL,
  target_group     TEXT    NOT NULL DEFAULT 'All Customers',
  recipients_count INTEGER NOT NULL DEFAULT 0,
  stats_sent       INTEGER NOT NULL DEFAULT 0,
  stats_delivered  INTEGER NOT NULL DEFAULT 0,
  stats_read       INTEGER NOT NULL DEFAULT 0,
  stats_failed     INTEGER NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- MESSAGES (WhatsApp message log)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL,  -- incoming, outgoing
  from_addr        TEXT NOT NULL,
  to_addr          TEXT NOT NULL,
  body             TEXT NOT NULL,
  is_auto_response BOOLEAN     NOT NULL DEFAULT FALSE,
  wa_message_id    TEXT,
  status           TEXT        DEFAULT 'sent',
  -- sent, delivered, read, failed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- WEBHOOK EVENTS (Audit log for Meta webhooks)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES businesses(id),
  event_type   TEXT,
  payload      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_business    ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_services_business     ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business     ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_datetime     ON bookings(business_id, date_time);
CREATE INDEX IF NOT EXISTS idx_ledger_customer       ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_business       ON ledger_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_business    ON wa_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_business    ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_business     ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_from         ON messages(business_id, from_addr);

-- Ensure has_seen_guide exists for existing DBs
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_guide BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure is_deleted exists for bookings and booking_id exists for ledger_entries
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Ensure slug exists for businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

