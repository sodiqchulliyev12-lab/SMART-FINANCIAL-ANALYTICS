-- Statistika hisobotlari (stat.uz): soliq turlari bilan bitta muddatlar tizimida, lekin to'lovsiz
ALTER TABLE tax_types ADD COLUMN turi TEXT NOT NULL DEFAULT 'soliq' CHECK (turi IN ('soliq','statistika'));
ALTER TABLE tax_types ADD COLUMN izoh TEXT NOT NULL DEFAULT '';
