-- 신발 색 선택지를 파스텔 톤으로 바꿨다. 없어진 색은 가장 비슷한 새 색으로 옮긴다.
UPDATE users
SET avatar_shoes_color = CASE avatar_shoes_color
    WHEN 'BLACK' THEN 'LAVENDER'
    WHEN 'BROWN' THEN 'BEIGE'
    WHEN 'RED' THEN 'PINK'
    WHEN 'BLUE' THEN 'SKY'
END
WHERE avatar_shoes_color IN ('BLACK', 'BROWN', 'RED', 'BLUE');
