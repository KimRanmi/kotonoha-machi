"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthNickname, restoreSession, safeNextPath } from "@/lib/storage";

// 앱 전체의 로그인 게이트. 로그인하지 않았다면 어느 화면으로 들어와도 /login(첫 화면)으로 보내고,
// 이미 로그인한 사람이 /login에 오면 마을로 보내고, 닉네임이 없는 계정은 닉네임 설정 화면(/nickname)으로 보낸다. 로그인 정보(access 토큰)는 메모리에 있고
// 새로고침하면 refresh 쿠키로 복구해야 하므로, 확인이 끝날 때까지는 아무것도 그리지 않는다(깜빡임 방지).
// 이후 세션이 끊기면 API가 401을 주고 갱신도 실패할 때 lib/storage.ts가 /login으로 보낸다.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const onLoginPage = pathname === "/login";

  useEffect(() => {
    let cancelled = false;
    restoreSession().then((loggedIn) => {
      if (cancelled) return;
      const nicknameUrl = (to: string) => `/nickname?next=${encodeURIComponent(to)}`;
      if (onLoginPage) {
        if (loggedIn) {
          const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
          router.replace(getAuthNickname() ? next : nicknameUrl(next));
          return;
        }
      } else if (!loggedIn) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      } else if (!getAuthNickname() && pathname !== "/nickname") {
        // 닉네임 도입 전에 가입한 계정: 주민들이 부를 이름을 먼저 정하게 한다.
        router.replace(nicknameUrl(pathname));
        return;
      }
      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, onLoginPage, router]);

  return allowed ? <>{children}</> : null;
}
