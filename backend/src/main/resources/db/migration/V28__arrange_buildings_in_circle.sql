-- 건물을 광장 둘레에 둥근 U자로 다시 놓는다. rotation은 문이 향하는 방향(도, 0이면 문이 +z, 시계 방향이 아니라 three.js rotation.y 방향)이고
-- 문이 광장 가운데를 바라보게 정한 값이다. 값의 원본은 구글 시트이므로 시트에도 같은 x, z, rotation을 적는다.
ALTER TABLE building ADD COLUMN rotation DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE building SET x = -1.22, z = 13.95, rotation = 175.0 WHERE slug = 'flower';
UPDATE building SET x = -6.28, z = 12.51, rotation = 153.3 WHERE slug = 'bakery';
UPDATE building SET x = -10.46, z = 9.31, rotation = 131.7 WHERE slug = 'tea_house';
UPDATE building SET x = -13.16, z = 4.79, rotation = 110.0 WHERE slug = 'cafe';
UPDATE building SET x = -13.99, z = -0.41, rotation = 88.3 WHERE slug = 'convenience';
UPDATE building SET x = -12.86, z = -5.55, rotation = 66.7 WHERE slug = 'ramen';
UPDATE building SET x = -9.9, z = -9.9, rotation = 45.0 WHERE slug = 'home';
UPDATE building SET x = -5.55, z = -12.86, rotation = 23.3 WHERE slug = 'school';
UPDATE building SET x = -0.41, z = -13.99, rotation = 1.7 WHERE slug = 'library';
UPDATE building SET x = 4.79, z = -13.16, rotation = 340.0 WHERE slug = 'bike_shop';
UPDATE building SET x = 9.31, z = -10.46, rotation = 318.3 WHERE slug = 'temple';
UPDATE building SET x = 12.51, z = -6.28, rotation = 296.7 WHERE slug = 'takoyaki';
UPDATE building SET x = 13.95, z = -1.22, rotation = 275.0 WHERE slug = 'izakaya';
