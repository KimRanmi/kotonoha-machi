"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/storage";

// 앱 전체의 로그인 게이트. 로그인하지 않았다면 어느 화면으로 들어와도 /login(첫 화면)으로 보내고,
// 이미 로그인한 사람이 /login에 오면 마을로 보낸다. 토큰은 localStorage에 있어 서버 렌더링 시에는
// 알 수 없으므로, 마운트 후 확인이 끝날 때까지는 아무것도 그리지 않는다(깜빡임 방지).
// 토큰이 만료/무효인 경우는 API가 401을 주면 lib/storage.ts가 /login으로 보낸다.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const onLoginPage = pathname === "/login";

  useEffect(() => {
    const loggedIn = isLoggedIn();
    if (onLoginPage) {
      if (loggedIn) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
        return;
      }
    } else if (!loggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(true);
  }, [pathname, onLoginPage, router]);

  return allowed ? <>{children}</> : null;
}
