-- Aqilli Moliya: boshlang'ich sxema

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  fio           TEXT NOT NULL,
  login         TEXT NOT NULL UNIQUE,
  pass_hash     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  lavozim       TEXT NOT NULL DEFAULT '',
  tg_chat_id    BIGINT UNIQUE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  fail_count    INT NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  session_ver   INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id          SERIAL PRIMARY KEY,
  nomi        TEXT NOT NULL,
  stir        TEXT NOT NULL UNIQUE,
  rejim       TEXT NOT NULL CHECK (rejim IN ('qqs','soddalashtirilgan','aylanma')),
  faoliyat    TEXT NOT NULL DEFAULT '',
  direktor    TEXT NOT NULL DEFAULT '',
  telefon     TEXT NOT NULL DEFAULT '',
  bank        TEXT NOT NULL DEFAULT '',
  hisob_raqam TEXT NOT NULL DEFAULT '',
  masul_id    INT REFERENCES users(id) ON DELETE SET NULL,
  izoh        TEXT NOT NULL DEFAULT '',
  arxiv       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tax_types (
  code     TEXT PRIMARY KEY,
  nomi     TEXT NOT NULL,
  davr     TEXT NOT NULL CHECK (davr IN ('oy','chorak','yil')),
  oy_offset INT NOT NULL,
  kun      INT NOT NULL CHECK (kun BETWEEN 1 AND 31)
);

CREATE TABLE company_taxes (
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  soliq      TEXT NOT NULL REFERENCES tax_types(code) ON DELETE CASCADE,
  PRIMARY KEY (company_id, soliq)
);

CREATE TABLE calendar_days (
  sana DATE PRIMARY KEY,
  tur  TEXT NOT NULL CHECK (tur IN ('bayram','dam','ish')),
  nomi TEXT NOT NULL DEFAULT ''
);

CREATE TABLE deadlines (
  id             SERIAL PRIMARY KEY,
  company_id     INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  soliq          TEXT NOT NULL REFERENCES tax_types(code) ON DELETE CASCADE,
  davr           TEXT NOT NULL,
  muddat         DATE NOT NULL,
  hisobot_holati TEXT NOT NULL DEFAULT 'kutilmoqda' CHECK (hisobot_holati IN ('kutilmoqda','topshirildi')),
  tolov_holati   TEXT NOT NULL DEFAULT 'kutilmoqda' CHECK (tolov_holati IN ('kutilmoqda','tolandi','yoq')),
  belgiladi_id   INT REFERENCES users(id) ON DELETE SET NULL,
  belgi_vaqt     TIMESTAMPTZ,
  UNIQUE (company_id, soliq, davr)
);
CREATE INDEX deadlines_muddat ON deadlines (muddat);

CREATE TABLE financials (
  company_id       INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  davr             TEXT NOT NULL CHECK (davr ~ '^\d{4}-Q[1-4]$'),
  tushum           NUMERIC(20,2) NOT NULL DEFAULT 0,
  tannarx          NUMERIC(20,2) NOT NULL DEFAULT 0,
  sof_foyda        NUMERIC(20,2) NOT NULL DEFAULT 0,
  jami_aktiv       NUMERIC(20,2) NOT NULL DEFAULT 0,
  joriy_aktiv      NUMERIC(20,2) NOT NULL DEFAULT 0,
  pul              NUMERIC(20,2) NOT NULL DEFAULT 0,
  debitorlik       NUMERIC(20,2) NOT NULL DEFAULT 0,
  zaxira           NUMERIC(20,2) NOT NULL DEFAULT 0,
  joriy_majburiyat NUMERIC(20,2) NOT NULL DEFAULT 0,
  uzoq_majburiyat  NUMERIC(20,2) NOT NULL DEFAULT 0,
  kapital          NUMERIC(20,2) NOT NULL DEFAULT 0,
  kreditorlik      NUMERIC(20,2) NOT NULL DEFAULT 0,
  budjet_qarz      NUMERIC(20,2) NOT NULL DEFAULT 0,
  soliq_tolangan   NUMERIC(20,2) NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, davr)
);

CREATE TABLE letters (
  id            SERIAL PRIMARY KEY,
  company_id    INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tur           TEXT NOT NULL,
  raqam         TEXT NOT NULL,
  sana          DATE NOT NULL,
  mazmun        TEXT NOT NULL DEFAULT '',
  javob_muddati DATE,
  holati        TEXT NOT NULL DEFAULT 'yangi' CHECK (holati IN ('yangi','javob_berildi','yopildi')),
  manba         TEXT NOT NULL DEFAULT 'qolda',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, raqam)
);

CREATE TABLE ehf (
  id              SERIAL PRIMARY KEY,
  company_id      INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  raqam           TEXT NOT NULL,
  kontragent      TEXT NOT NULL,
  kontragent_stir TEXT NOT NULL DEFAULT '',
  summa           NUMERIC(20,2) NOT NULL DEFAULT 0,
  sana            DATE NOT NULL,
  yonalish        TEXT NOT NULL DEFAULT 'kiruvchi' CHECK (yonalish IN ('kiruvchi','chiquvchi')),
  holati          TEXT NOT NULL DEFAULT 'imzo_kutmoqda' CHECK (holati IN ('imzo_kutmoqda','imzolandi','rad')),
  xavfli          BOOLEAN NOT NULL DEFAULT FALSE,
  manba           TEXT NOT NULL DEFAULT 'qolda',
  UNIQUE (company_id, raqam)
);

CREATE TABLE leases (
  id         SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  raqam      TEXT NOT NULL,
  tomon      TEXT NOT NULL DEFAULT '',
  boshlanish DATE NOT NULL,
  tugash     DATE NOT NULL,
  holati     TEXT NOT NULL DEFAULT 'faol' CHECK (holati IN ('faol','tugagan','bekor')),
  manba      TEXT NOT NULL DEFAULT 'qolda',
  UNIQUE (company_id, raqam)
);

CREATE TABLE risk_snapshots (
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sana       DATE NOT NULL,
  ball       INT NOT NULL,
  daraja     TEXT NOT NULL,
  omillar    JSONB NOT NULL,
  PRIMARY KEY (company_id, sana)
);

CREATE TABLE settings (
  kalit  TEXT PRIMARY KEY,
  qiymat TEXT NOT NULL
);

CREATE TABLE tg_codes (
  code       TEXT PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_log (
  id        BIGSERIAL PRIMARY KEY,
  vaqt      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id   INT REFERENCES users(id) ON DELETE SET NULL,
  amal      TEXT NOT NULL,
  obyekt    TEXT NOT NULL,
  tafsilot  JSONB
);
CREATE INDEX audit_log_vaqt ON audit_log (vaqt DESC);

INSERT INTO settings (kalit, qiymat) VALUES
  ('firma_nomi', 'Aqilli Moliya'),
  ('bhm', '412000'),
  ('eslatma_soati', '9');
