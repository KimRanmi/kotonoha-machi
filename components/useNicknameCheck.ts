"use client";

import { useState } from "react";
import { checkNickname, validateNickname } from "@/lib/storage";

// 닉네임 중복 확인 상태. 확인한 뒤 입력을 고치면 "확인됨"이 풀린다(결과가 확인한 값에 묶여 있으므로).
// ownNickname: 지금 쓰고 있는 닉네임으로 "변경"하는 경우는 중복으로 보지 않는다.
export function useNicknameCheck(value: string, ownNickname: string | null = null) {
  const trimmed = value.trim();
  const [result, setResult] = useState<{ value: string; available: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    const invalid = validateNickname(trimmed);
    if (invalid) {
      setResult({ value: trimmed, available: false, message: invalid });
      return;
    }
    if (ownNickname && ownNickname.toLowerCase() === trimmed.toLowerCase()) {
      setResult({ value: trimmed, available: true, message: "지금 쓰고 있는 닉네임이에요." });
      return;
    }
    setChecking(true);
    try {
      const r = await checkNickname(trimmed);
      setResult({ value: trimmed, available: r.available, message: r.message });
    } catch (err) {
      setResult({
        value: trimmed,
        available: false,
        message: err instanceof Error ? err.message : "닉네임을 확인하지 못했습니다.",
      });
    } finally {
      setChecking(false);
    }
  }

  const current = result && result.value === trimmed ? result : null;
  return {
    verified: current?.available ?? false,
    message: current?.message ?? null,
    checking,
    check,
  };
}

export type NicknameCheck = ReturnType<typeof useNicknameCheck>;
