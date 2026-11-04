-- Ishchilar (my.mehnat.uz — Yagona milliy mehnat tizimi). JShShIR o'zi saqlanmaydi, faqat uning xeshi (kalit).
CREATE TABLE workers (
  id          SERIAL PRIMARY KEY,
  company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kalit       TEXT NOT NULL,
  fio         TEXT NOT NULL DEFAULT '',
  lavozim     TEXT NOT NULL DEFAULT '',
  shartnoma   TEXT NOT NULL DEFAULT '',   -- muddatsiz | muddatli | o'rindosh | fuqarolik-huquqiy ...
  kirgan      DATE NOT NULL,
  ketgan      DATE,
  manba       TEXT NOT NULL DEFAULT 'qolda',
  UNIQUE (company_id, kalit)
);
CREATE INDEX workers_company ON workers (company_id) WHERE ketgan IS NULL;
