"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatMessage, LearnedWord } from "@/lib/types";
import {
  WORDS_STORAGE_KEY,
  getChatStorageKey,
  loadFromStorage,
  saveToStorage,
} from "@/lib/storage";
import { DEFAULT_VILLAGER_ID, getVillager } from "@/lib/villager";
import VillagerMessage from "@/components/VillagerMessage";
import AddWordPopup, { WordPopupState } from "@/components/AddWordPopup";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 주민과의 자유 대화 UI. `/` 페이지와 `/town`의 대화 오버레이가 이 컴포넌트를 그대로
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
  const chatStorageKey = getChatStorageKey(villager.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<WordPopupState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage는 서버에 없으므로 클라이언트 마운트 후 한 번만 읽어와 하이드레이션한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(loadFromStorage<ChatMessage[]>(chatStorageKey, []));
    setWords(loadFromStorage<LearnedWord[]>(WORDS_STORAGE_KEY, []));
    setHydrated(true);
  }, [chatStorageKey]);

  useEffect(() => {
    if (hydrated) saveToStorage(chatStorageKey, messages);
  }, [messages, hydrated, chatStorageKey]);

  useEffect(() => {
    if (hydrated) saveToStorage(WORDS_STORAGE_KEY, words);
  }, [words, hydrated]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villagerId: villager.id,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "알 수 없는 오류가 발생했습니다.");
      }
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
    <div className="page">
      <header className="header">
        <div className="villagerInfo">
          <div className="villagerAvatar">{villager.avatar}</div>
          <div>
            <div className="villagerName">{villager.name}</div>
            <div className="villagerDesc">{villager.description}</div>
          </div>
        </div>
        <div className="headerActions">
          <Link href="/words" className="navLink">
            학습 목록 ({words.length})
          </Link>
          {!onClose && (
            <Link href="/town" className="navLink">
              마을로 가기
            </Link>
          )}
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
        {messages.length === 0 && (
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

      <form
        className="inputBar"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          className="textInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="일본어로 메시지를 입력하세요..."
          disabled={isLoading}
        />
        <button type="submit" className="sendButton" disabled={isLoading || !input.trim()}>
          보내기
        </button>
      </form>

      {popup && (
        <AddWordPopup popup={popup} onAdd={handleAddWord} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}
