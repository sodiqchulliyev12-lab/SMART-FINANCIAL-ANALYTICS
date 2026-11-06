-- Muddatlar Soliq kodeksi va MIV 08.10.2024 y. 181-son buyrug'i (AV 3567) bo'yicha:
-- yillik moliyaviy hisobot (BHMS) — keyingi yilning 1-martigacha;
-- mol-mulk solig'i bo'nak ma'lumotnomasi va yer solig'i hisob-kitobi — joriy yilning 20-yanvarigacha.
UPDATE tax_types SET oy_offset = 3, kun = 1 WHERE code = 'moliyaviy';
UPDATE tax_types SET nomi = 'Yer solig''i (yillik hisob-kitob)', oy_offset = -11, kun = 20 WHERE code = 'yer';
INSERT INTO tax_types (code, nomi, davr, oy_offset, kun, turi, izoh)
VALUES ('mol_mulk_bonak', 'Mol-mulk solig''i (bo''nak ma''lumotnomasi)', 'yil', -11, 20, 'soliq', 'Joriy yilning 20-yanvarigacha; to''lov har oy 10-sanagacha (yanvar — 20-sana)')
ON CONFLICT (code) DO NOTHING;
INSERT INTO company_taxes (company_id, soliq)
SELECT company_id, 'mol_mulk_bonak' FROM company_taxes WHERE soliq = 'mol_mulk'
ON CONFLICT DO NOTHING;
