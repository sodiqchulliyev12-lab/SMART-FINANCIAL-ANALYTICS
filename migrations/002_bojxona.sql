-- Bojxona: dep.customs.uz/qarzdor (qarz), contract.customs.uz (TIF shartnomalari), ed2.customs.uz (deklaratsiyalar)

CREATE TABLE customs_debts (
  company_id  INT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  summa       NUMERIC(18,2) NOT NULL DEFAULT 0,
  tafsilot    TEXT NOT NULL DEFAULT '',
  tekshirildi DATE NOT NULL DEFAULT CURRENT_DATE,
  manba       TEXT NOT NULL DEFAULT 'qolda'
);

CREATE TABLE customs_contracts (
  id          SERIAL PRIMARY KEY,
  company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  raqam       TEXT NOT NULL,
  turi        TEXT NOT NULL DEFAULT 'import' CHECK (turi IN ('import','eksport')),
  kontragent  TEXT NOT NULL DEFAULT '',
  davlat      TEXT NOT NULL DEFAULT '',
  valyuta     TEXT NOT NULL DEFAULT 'USD',
  summa       NUMERIC(18,2) NOT NULL DEFAULT 0,
  tolangan    NUMERIC(18,2) NOT NULL DEFAULT 0,  -- import: chetga to'langan; eksport: tushgan pul
  yetkazilgan NUMERIC(18,2) NOT NULL DEFAULT 0,  -- import: kelgan tovar; eksport: jo'natilgan tovar
  ochiq_sana  DATE,                               -- qoplanmagan qism paydo bo'lgan sana (to'lov yoki jo'natish)
  sana        DATE NOT NULL,
  tugash      DATE,
  holati      TEXT NOT NULL DEFAULT 'faol' CHECK (holati IN ('faol','yopilgan','bekor')),
  manba       TEXT NOT NULL DEFAULT 'qolda',
  UNIQUE (company_id, raqam)
);

CREATE TABLE customs_declarations (
  id          SERIAL PRIMARY KEY,
  company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  raqam       TEXT NOT NULL,
  sana        DATE NOT NULL,
  rejim       TEXT NOT NULL DEFAULT '',
  turi        TEXT NOT NULL DEFAULT 'import' CHECK (turi IN ('import','eksport','boshqa')),
  shartnoma   TEXT NOT NULL DEFAULT '',
  valyuta     TEXT NOT NULL DEFAULT 'USD',
  summa       NUMERIC(18,2) NOT NULL DEFAULT 0,
  boj_tolov   NUMERIC(18,2) NOT NULL DEFAULT 0,
  holati      TEXT NOT NULL DEFAULT 'rasmiylashtirildi',
  manba       TEXT NOT NULL DEFAULT 'qolda',
  UNIQUE (company_id, raqam)
);
CREATE INDEX customs_declarations_company_sana ON customs_declarations (company_id, sana DESC);
