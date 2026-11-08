-- 시트 주민 20명(V18)으로 교체하면서 시트에 없는 시드 주민 ミユ를 정리한다.
-- resident_friendship은 ON DELETE CASCADE라서 ミユ와의 친밀도 행도 함께 지워진다.
DELETE FROM resident WHERE slug = 'miyu';
