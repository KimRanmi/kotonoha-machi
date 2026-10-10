"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NicknameField from "@/components/NicknameField";
import { useNicknameCheck } from "@/components/useNicknameCheck";
import { getAuthNickname, safeNextPath, setNickname } from "@/lib/storage";

// 닉네임 설정 화면. 닉네임 도입 전에 가입한 계정이 처음 정하거나, 이미 정한 사람이 바꿀 때 쓴다.
function NicknameForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const current = getAuthNickname();
  const [value, setValue] = useState(current ?? "");
  const check = useNicknameCheck(value, current);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !check.verified) return;
    setError(null);
    setSubmitting(true);
    try {
      await setNickname(value.trim());
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="villagerInfo">
          <div>
            <div className="villagerName">{current ? "닉네임 변경" : "닉네임 정하기"}</div>
            <div className="villagerDesc">마을 주민들이 어디서든 이 이름으로 불러줘요</div>
          </div>
        </div>
      </header>

      <main className="wordListMain">
        <form className="authForm" onSubmit={handleSubmit}>
          <NicknameField value={value} onChange={setValue} check={check} />
          {error && <p className="errorText">{error}</p>}
          <button type="submit" className="sendButton" disabled={submitting || !check.verified}>
            {current ? "변경하기" : "시작하기"}
          </button>
          {!check.verified && (
            <p className="nicknameHint">닉네임을 정하고 &lsquo;중복 확인&rsquo;을 눌러주세요.</p>
          )}
        </form>
      </main>
    </div>
  );
}

export default function NicknamePage() {
  return (
    <Suspense>
      <NicknameForm />
    </Suspense>
  );
}
