-- scripts/import-buildings 가 구글 시트에서 생성한 마을 건물 upsert. 검토 후 커밋한다.
-- 시트에서 지운 건물은 삭제하지 않는다.

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('flower', '花屋', -17.4, -6, 4, 3.5, 2.5, '#E8A0B4', '꽃집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('bakery', 'パン屋', -11.6, -6, 4, 3.5, 2.5, '#E6C48A', '빵집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('tea_house', 'お茶屋', -5.8, -6, 4, 3.5, 2.5, '#7FA37A', '찻집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('cafe', 'カフェ', 0, -6, 4, 3.5, 2.5, '#C97B4A', '카페')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('convenience', 'コンビニ', 5.8, -6, 4, 3.5, 2.5, '#8FB8D8', '편의점')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('ramen', 'ラーメン屋', 11.6, -6, 4, 3.5, 2.5, '#D9776B', '라면집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('home', 'わが家', 17.4, -6, 4, 4, 2.2, '#E8C07D', '집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('school', '学校', -14.5, -13, 4, 3.5, 2.5, '#B8B8D8', '학교')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('library', '図書館', -8.7, -13, 4, 3.5, 2.5, '#9C8468', '도서관')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('bike_shop', 'バイク屋', -2.9, -13, 4, 3.5, 2.5, '#7E8794', '오토바이 가게')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('temple', 'お寺', 2.9, -13, 4, 3.5, 2.5, '#A65E4A', '절')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('takoyaki', 'たこ焼き屋', 8.7, -13, 4, 3.5, 2.5, '#E3A65C', '타코야끼 가게')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;

INSERT INTO building (slug, label, x, z, width, depth, height, color, location)
VALUES ('izakaya', '居酒屋', 14.5, -13, 4, 3.5, 2.5, '#6F5B73', '술집')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, x = EXCLUDED.x, z = EXCLUDED.z, width = EXCLUDED.width, depth = EXCLUDED.depth, height = EXCLUDED.height, color = EXCLUDED.color, location = EXCLUDED.location;
