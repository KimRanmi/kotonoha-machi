"use client";

import type { NicknameCheck } from "@/components/useNicknameCheck";

// 닉네임 입력 + 중복 확인 버튼 + 결과 문구. 가입 화면과 닉네임 설정 화면이 함께 쓴다.
export default function NicknameField({
  value,
  onChange,
  check,
}: {
  value: string;
  onChange: (value: string) => void;
  check: NicknameCheck;
}) {
  return (
    <div className="nicknameField">
      <div className="nicknameRow">
        <input
          className="textInput"
          type="text"
          autoComplete="nickname"
          placeholder="닉네임 (주민들이 이 이름으로 불러요)"
          value={value}
          maxLength={12}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          className="sendButton"
          onClick={check.check}
          disabled={check.checking || !value.trim()}
        >
          {check.checking ? "확인 중..." : "중복 확인"}
        </button>
      </div>
      {check.message && (
        <p className={check.verified ? "nicknameOk" : "errorText"}>{check.message}</p>
      )}
    </div>
  );
}
