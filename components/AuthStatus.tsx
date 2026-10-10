"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthEmail, logout } from "@/lib/storage";

// 로그인 상태 표시: 로그인했으면 이메일 + 로그아웃, 아니면 로그인 링크.
export default function AuthStatus({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // 로그인 정보는 브라우저 메모리에 있어 서버 렌더링 시에는 알 수 없으므로 마운트 후 한 번 읽는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(getAuthEmail());
  }, []);

  if (!email) {
    return (
      <Link href="/login" className={className}>
        로그인
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      title={email}
      onClick={async () => {
        await logout();
        setEmail(null);
        router.push("/login");
      }}
    >
      로그아웃
    </button>
  );
}
