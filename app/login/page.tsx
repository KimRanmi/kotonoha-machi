"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NicknameField from "@/components/NicknameField";
import { useNicknameCheck } from "@/components/useNicknameCheck";
import { login, safeNextPath, signup } from "@/lib/storage";

function LoginForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const nicknameCheck = useNicknameCheck(nickname);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || (mode === "signup" && !nicknameCheck.verified)) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, nickname.trim());
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
            <div className="villagerName">{mode === "login" ? "로그인" : "회원가입"}</div>
            <div className="villagerDesc">대화 기록과 주민과의 사이가 계정에 저장돼요</div>
          </div>
        </div>
      </header>

      <main className="wordListMain">
        <form className="authForm" onSubmit={handleSubmit}>
          <input
            className="textInput"
            type="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="textInput"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "비밀번호" : "비밀번호 (8자 이상)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          {mode === "signup" && (
            <NicknameField value={nickname} onChange={setNickname} check={nicknameCheck} />
          )}
          {error && <p className="errorText">{error}</p>}
          <button
            type="submit"
            className="sendButton"
            disabled={submitting || (mode === "signup" && !nicknameCheck.verified)}
          >
            {mode === "login" ? "로그인" : "가입하고 시작하기"}
          </button>
          <button
            type="button"
            className="authSwitch"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있어요 · 로그인"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams는 정적 빌드에서 Suspense 경계가 필요하다.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
