-- 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발) 선택값.
-- 기존 사용자도 바로 쓸 수 있도록 각 축에 기본값을 둔다(가입 직후와 동일한 값).
ALTER TABLE users
    ADD COLUMN avatar_skin_color VARCHAR(20) NOT NULL DEFAULT 'LIGHT',
    ADD COLUMN avatar_hair_color VARCHAR(20) NOT NULL DEFAULT 'BLACK',
    ADD COLUMN avatar_hair_style VARCHAR(20) NOT NULL DEFAULT 'SHORT',
    ADD COLUMN avatar_clothes_style VARCHAR(20) NOT NULL DEFAULT 'PLAIN',
    ADD COLUMN avatar_shoes_color VARCHAR(20) NOT NULL DEFAULT 'WHITE';
