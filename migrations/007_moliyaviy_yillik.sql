-- Balans (1-shakl) va moliyaviy natijalar (2-shakl) yillik hisobot: keyingi yilning 15-fevraligacha
UPDATE tax_types SET nomi = 'Moliyaviy hisobot (yillik: balans va moliyaviy natijalar)', davr = 'yil', oy_offset = 2, kun = 15 WHERE code = 'moliyaviy';
DELETE FROM deadlines WHERE soliq = 'moliyaviy' AND davr LIKE '%-Q%';
