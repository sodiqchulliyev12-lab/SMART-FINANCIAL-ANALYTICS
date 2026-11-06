-- AI Soliq (ai.soliq.uz) xulosalari: ofisdagi yig'uvchi dastur ERI bilan kirib, har korxona bo'yicha oxirgi natijani yuboradi.
CREATE TABLE ai_soliq (
  company_id    INT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  sana          DATE NOT NULL,
  reyting       TEXT NOT NULL DEFAULT '',         -- barqarorlik reytingi (masalan "A", "BBB" yoki ball)
  qarz          NUMERIC(18,2) NOT NULL DEFAULT 0, -- Ekspress audit: soliq qarzi (penya bilan)
  kamchiliklar  JSONB NOT NULL DEFAULT '[]',      -- Ekspress audit: "Kamchiliklar va tavsiyalar" matnlari
  avtokameral   JSONB NOT NULL DEFAULT '[]',      -- AI Avtokameral: nomuvofiqlik mezonlari
  ehf_xavfli    INT NOT NULL DEFAULT 0,           -- AI EHF: qizil belgilangan fakturalar soni
  imtiyozlar    JSONB NOT NULL DEFAULT '[]',      -- AI Imtiyoz: foydalanish mumkin bo'lgan imtiyozlar
  yangilangan   TIMESTAMPTZ NOT NULL DEFAULT now()
);
