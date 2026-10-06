"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as wanakana from "wanakana";
import { ChatMessage, LearnedWord } from "@/lib/types";
import {
  WORDS_STORAGE_KEY,
  fetchChatHistory,
  loadFromStorage,
  saveToStorage,
  sendChat,
} from "@/lib/storage";
import { DEFAULT_VILLAGER_ID, getVillager } from "@/lib/villager";
import VillagerMessage from "@/components/VillagerMessage";
import AddWordPopup, { WordPopupState } from "@/components/AddWordPopup";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 주민과의 자유 대화 UI. 마을(`/`)의 대화 오버레이가 이 컴포넌트를 그대로
// 재사용한다 — 대화 로직(저장, API 호출)을 두 곳에 중복 구현하지 않기 위함이다.
// villagerId로 어떤 주민과 대화할지 고르고(기본은 카페의 미유), onClose가 주어지면
// (오버레이로 쓰일 때) 닫기 버튼을 보여준다.
export default function ChatPanel({
  villagerId = DEFAULT_VILLAGER_ID,
  onClose,
}: {
  villagerId?: string;
  onClose?: () => void;
}) {
  const villager = getVillager(villagerId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<WordPopupState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [kanaEnabled, setKanaEnabled] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || !kanaEnabled) return;
    // wanakana가 입력창 DOM을 직접 다루므로 이 입력창은 React가 value를 강제하지 않는
    // 비제어(uncontrolled) 컴포넌트로 둔다 (커서 위치를 wanakana가 관리).
    wanakana.bind(el);
    return () => {
      wanakana.unbind(el);
    };
  }, [kanaEnabled]);

  useEffect(() => {
    // 대화 기록은 서버(DB)에서, 학습 단어는 localStorage에서(4단계 전까지) 마운트 후 한 번 불러온다.
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false);
    setWords(loadFromStorage<LearnedWord[]>(WORDS_STORAGE_KEY, []));
    fetchChatHistory(villager.id)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "대화 기록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [villager.id]);

  useEffect(() => {
    if (hydrated) saveToStorage(WORDS_STORAGE_KEY, words);
  }, [words, hydrated]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading || !hydrated) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    if (inputRef.current) inputRef.current.value = "";
    setError(null);
    setIsLoading(true);

    try {
      const data = await sendChat(
        villager.id,
        nextMessages.map((m) => ({ role: m.role, content: m.content })),
      );
      const villagerMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.reply,
        translation: data.translation || undefined,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, villagerMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleWordClick(word: string, x: number, y: number) {
    const alreadyAdded = words.some((w) => w.word === word);
    setPopup({ word, x, y, alreadyAdded });
  }

  function handleAddWord(word: string) {
    setWords((prev) => {
      if (prev.some((w) => w.word === word)) return prev;
      return [...prev, { word, addedAt: Date.now() }];
    });
  }

  return (
    <div className={onClose ? "page modalPage" : "page"}>
      <header className="header">
        <div className="villagerInfo">
          <div className="villagerAvatar">{villager.avatar}</div>
          <div>
            <div className="villagerName">{villager.name}</div>
            <div className="villagerDesc">{villager.description}</div>
          </div>
        </div>
        <div className="headerActions">
          <Link href="/villagers" className="navLink">
            주민 목록
          </Link>
          <Link href="/words" className="navLink">
            학습 목록 ({words.length})
          </Link>
          {onClose && (
            <button
              type="button"
              className="closeButton"
              onClick={onClose}
              aria-label="대화 닫기"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <main className="chatLog">
        {hydrated && messages.length === 0 && (
          <p className="emptyHint">
            {villager.name}에게 일본어로 말을 걸어보세요. 예: 「こんにちは」
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "bubbleUser" : "bubbleVillager"}
          >
            {m.role === "assistant" ? (
              <>
                <VillagerMessage text={m.content} onWordClick={handleWordClick} />
                {m.translation && (
                  <div className="translationText">{m.translation}</div>
                )}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="bubbleVillager bubbleLoading">
            {villager.name}가 답하는 중...
          </div>
        )}
        <div ref={logEndRef} />
      </main>

      {error && <p className="errorText">{error}</p>}

      <label className="kanaToggle">
        <input
          type="checkbox"
          checked={kanaEnabled}
          onChange={(e) => setKanaEnabled(e.target.checked)}
        />
        로마자 자동 변환 (예: konnichiwa → こんにちは)
      </label>

      <form
        className="inputBar"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          ref={inputRef}
          className="textInput"
          defaultValue=""
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="일본어로 메시지를 입력하세요..."
          disabled={isLoading}
        />
        <button type="submit" className="sendButton" disabled={isLoading || !hydrated || !input.trim()}>
          보내기
        </button>
      </form>

      {popup && (
        <AddWordPopup popup={popup} onAdd={handleAddWord} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}
