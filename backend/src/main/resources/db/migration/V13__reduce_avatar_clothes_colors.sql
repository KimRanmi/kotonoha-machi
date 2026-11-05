-- 옷 색 선택지를 11색에서 파스텔 8색으로 줄였다. 없어진 값을 가장 비슷한 새 색으로 옮긴다.
UPDATE users
SET avatar_clothes_color = CASE avatar_clothes_color
    WHEN 'WHITE' THEN 'CREAM'
    WHEN 'BLACK' THEN 'LAVENDER'
    WHEN 'RED' THEN 'CORAL'
    WHEN 'ORANGE' THEN 'PEACH'
    WHEN 'GREEN' THEN 'MINT'
    WHEN 'BLUE' THEN 'SKY'
    WHEN 'PURPLE' THEN 'LAVENDER'
END
WHERE avatar_clothes_color IN ('WHITE', 'BLACK', 'RED', 'ORANGE', 'GREEN', 'BLUE', 'PURPLE');
