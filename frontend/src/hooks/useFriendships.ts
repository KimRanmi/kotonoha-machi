import { useCallback, useEffect, useState } from 'react';
import { getFriendships, type Friendships } from '../api/resident';

/**
 * 주민별 친밀도를 서버에서 한 번 불러오고, 대화로 바뀐 값을 반영하는 함수를 돌려준다.
 * 친밀도는 하트 표시용 보조 정보라 불러오지 못해도 화면을 막지 않고 0으로 보여 준다.
 */
export function useFriendships() {
  const [friendships, setFriendships] = useState<Friendships>({});

  useEffect(() => {
    let cancelled = false;
    getFriendships()
      .then((loaded) => {
        if (!cancelled) {
          setFriendships(loaded);
        }
      })
      .catch(() => {
        // 하트는 보조 정보라 실패해도 0으로 둔다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setFriendshipLevel = useCallback((residentSlug: string, level: number) => {
    setFriendships((previous) => ({ ...previous, [residentSlug]: level }));
  }, []);

  return { friendships, setFriendshipLevel };
}
