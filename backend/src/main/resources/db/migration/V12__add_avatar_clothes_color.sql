-- 캐릭터 꾸미기에 옷 색 축을 추가한다. 기존 사용자도 바로 쓸 수 있도록 기본값을 둔다.
ALTER TABLE users
    ADD COLUMN avatar_clothes_color VARCHAR(20) NOT NULL DEFAULT 'SKY';
