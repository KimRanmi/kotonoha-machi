-- 주민 페르소나를 시트(CSV)에서 관리하기 위한 열. slug는 시트 행과 DB 행을 잇는 안정적인 키다.
ALTER TABLE resident ADD COLUMN slug VARCHAR(50);
ALTER TABLE resident ADD COLUMN speech_style VARCHAR(300) NOT NULL DEFAULT '';
ALTER TABLE resident ADD COLUMN background VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE resident ADD COLUMN sample_lines VARCHAR(500) NOT NULL DEFAULT '';

UPDATE resident SET slug = 'miyu' WHERE name = 'ミユ';
UPDATE resident SET slug = 'nana' WHERE name = 'ナナ';

ALTER TABLE resident ALTER COLUMN slug SET NOT NULL;
ALTER TABLE resident ADD CONSTRAINT uq_resident_slug UNIQUE (slug);
