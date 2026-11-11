-- V28에서 광장 둘레에 둥글게 놓았던 건물을 큰길과 골목을 따라 넓게 흩어 놓는다(rotation 열은 V28이 만들었다).
-- rotation은 문이 향하는 방향(도)이다. 0이면 문이 +z 쪽이고, three.js의 y축 회전 방향을 따른다(90이면 문이 +x 쪽).
-- 카메라가 (+x, +z)에서 내려다보므로 문이 보이게 대부분 0 또는 90 근처로 두고, 반듯해 보이지 않게 조금씩 틀었다.
-- 길은 프런트(lib/villageScenery.ts)에 있고 건물은 그 길가에 놓았다. 값의 원본은 구글 시트이므로 시트에도 같은 x, z, rotation을 적는다.
-- 큰길(동서) 북쪽
UPDATE building SET x = -19.5, z = -5, rotation = 6 WHERE slug = 'flower';
UPDATE building SET x = -13, z = -4.8, rotation = -8 WHERE slug = 'bakery';
UPDATE building SET x = -6, z = -4.2, rotation = 5 WHERE slug = 'cafe';
UPDATE building SET x = 8, z = -3.8, rotation = 0 WHERE slug = 'convenience';
UPDATE building SET x = 20, z = -3, rotation = -6 WHERE slug = 'ramen';
-- 북쪽 길: 찻집, 도서관을 지나 길 끝에 절
UPDATE building SET x = -3.8, z = -10.5, rotation = 95 WHERE slug = 'tea_house';
UPDATE building SET x = -6, z = -19, rotation = 80 WHERE slug = 'library';
UPDATE building SET x = -2.5, z = -36, rotation = 0 WHERE slug = 'temple';
-- 북동쪽 골목: 학교, 골목 끝에 타코야끼 가게
UPDATE building SET x = 22.5, z = -13, rotation = 90 WHERE slug = 'school';
UPDATE building SET x = 23, z = -26, rotation = 10 WHERE slug = 'takoyaki';
-- 남쪽 길: 오토바이 가게, 술집
UPDATE building SET x = 10.5, z = 9, rotation = 85 WHERE slug = 'bike_shop';
UPDATE building SET x = 9, z = 22, rotation = 80 WHERE slug = 'izakaya';
-- 서쪽 골목 안쪽: 내 집
UPDATE building SET x = -31.5, z = 13, rotation = 95 WHERE slug = 'home';
