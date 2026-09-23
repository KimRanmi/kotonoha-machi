"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatMessage, LearnedWord } from "@/lib/types";
import {
  CHAT_STORAGE_KEY,
  WORDS_STORAGE_KEY,
  loadFromStorage,
  saveToStorage,
} from "@/lib/storage";
import { VILLAGER_NAME } from "@/lib/villager";
import VillagerMessage from "@/components/VillagerMessage";
import AddWordPopup, { WordPopupState } from "@/components/AddWordPopup";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatPage() {
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
    setMessages(loadFromStorage<ChatMessage[]>(CHAT_STORAGE_KEY, []));
    setWords(loadFromStorage<LearnedWord[]>(WORDS_STORAGE_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveToStorage(CHAT_STORAGE_KEY, messages);
  }, [messages, hydrated]);

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
          <div className="villagerAvatar">☕</div>
          <div>
            <div className="villagerName">{VILLAGER_NAME}</div>
            <div className="villagerDesc">마을 카페를 운영하는 친절한 주민</div>
          </div>
        </div>
        <Link href="/words" className="navLink">
          학습 목록 ({words.length})
        </Link>
      </header>

      <main className="chatLog">
        {messages.length === 0 && (
          <p className="emptyHint">
            {VILLAGER_NAME}에게 일본어로 말을 걸어보세요. 예: 「こんにちは」
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
            {VILLAGER_NAME}가 답하는 중...
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
