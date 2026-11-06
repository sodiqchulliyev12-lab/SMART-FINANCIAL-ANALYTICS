-- my.soliq.uz da bitta raqam bilan ikki xil hujjat bo'lishi mumkin (masalan, xatlash qarori va uni bekor qilish qarori)
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_company_id_raqam_key;
ALTER TABLE letters ADD CONSTRAINT letters_company_tur_raqam_key UNIQUE (company_id, tur, raqam);
