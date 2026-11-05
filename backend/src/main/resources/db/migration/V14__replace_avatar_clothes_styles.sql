-- 옷 종류를 정리했다(이상하게 보이는 옷 제거, 카디건·교복·원피스 추가).
-- 없어진 옷은 가장 비슷한 새 옷으로 옮긴다.
UPDATE users
SET avatar_clothes_style = CASE avatar_clothes_style
    WHEN 'HOODIE' THEN 'PLAIN'
    WHEN 'JACKET' THEN 'CARDIGAN'
    WHEN 'COAT' THEN 'CARDIGAN'
    WHEN 'SUIT' THEN 'SCHOOL_UNIFORM'
    WHEN 'DRESS' THEN 'ONEPIECE'
    WHEN 'CHECKER' THEN 'STRIPES'
    WHEN 'TIE' THEN 'PLAIN'
END
WHERE avatar_clothes_style IN ('HOODIE', 'JACKET', 'COAT', 'SUIT', 'DRESS', 'CHECKER', 'TIE');
