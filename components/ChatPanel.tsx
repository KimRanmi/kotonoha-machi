"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as wanakana from "wanakana";
import { ChatMessage, LearnedWord } from "@/lib/types";
import { addWord, fetchChatHistory, fetchWords, GeminiError, sendChat, translateText } from "@/lib/storage";
import { DEFAULT_VILLAGER_ID, getVillager } from "@/lib/villager";
import VillagerFace from "@/components/VillagerFace";
import VillagerMessage from "@/components/VillagerMessage";
import AddWordPopup, { WordPopupState } from "@/components/AddWordPopup";
import { WORDS_CHANGED_EVENT } from "@/lib/words";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Web Speech API는 표준 타입 정의가 없어 브라우저별 생성자를 직접 참조한다.
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// 주민과의 자유 대화 UI. 마을(`/`)의 대화 오버레이가 이 컴포넌트를 그대로
// 재사용한다 — 대화 로직(저장, API 호출)을 두 곳에 중복 구현하지 않기 위함이다.
// villagerId로 어떤 주민과 대화할지 고르고(기본은 카페의 미유), onClose가 주어지면
// (오버레이로 쓰일 때) 닫기 버튼을 보여준다.
export default function ChatPanel({
  villagerId = DEFAULT_VILLAGER_ID,
  onClose,
  onExchange,
  hint,
  blurReplies = false,
}: {
  villagerId?: string;
  onClose?: () => void;
  // 주민의 답을 받을 때마다 (사용자가 보낸 말, 주민의 답) 알려준다. 카페 주문 등 대화로 뭔가를 시작할 때 쓴다.
  onExchange?: (userText: string, reply: string) => void;
  // 입력줄 위에 보여줄 작은 안내 문구
  hint?: string;
  // 듣기 연습: 주민의 말을 음성으로만 들려주고 글자는 가려 둔다(눌러서 확인)
  blurReplies?: boolean;
}) {
  const villager = getVillager(villagerId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 보내려던 말은 응답이 성공하기 전까지 대화 기록이 아니다. 전송 중에는 pendingText로만 보여주고,
  // 실패하면 입력창에 그대로 남긴 채 failedSend에 담아 "다시 시도"로 같은 말을 다시 보낸다.
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [failedSend, setFailedSend] = useState<{ text: string; message: string } | null>(null);
  const [slowConnection, setSlowConnection] = useState(false);
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const sendingRef = useRef(false);
  const [popup, setPopup] = useState<WordPopupState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  // 다른 곳(주문 등)에서 단어 목록이 바뀌면 다시 읽어 와서, 아래의 저장이 새 단어를 덮어쓰지 않게 한다.
  useEffect(() => {
    const reload = () => {
      fetchWords()
        .then(setWords)
        .catch(() => undefined);
    };
    window.addEventListener(WORDS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(WORDS_CHANGED_EVENT, reload);
  }, []);
  const [kanaEnabled, setKanaEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  // 번역은 기본 숨김. 펼친 답변의 id만 들고 있다(메시지별 독립).
  const [shownTranslations, setShownTranslations] = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});

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
    // 대화 기록과 학습 단어를 서버(DB)에서 마운트 후 한 번 불러온다.
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false);
    fetchWords()
      .then((loaded) => {
        if (!cancelled) setWords(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "학습 단어를 불러오지 못했습니다.");
      });
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
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 서버가 일시 장애로 재시도하는 동안(최대 약 10초) 응답이 늦어지므로, 3초 넘게 걸리면 "연결 중…"으로 바꿔 보여준다.
  useEffect(() => {
    if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlowConnection(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowConnection(true), 3000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    // sendingRef: 상태 갱신보다 빠른 연속 호출(더블클릭, 음성 결과와 겹침)도 막는다.
    if (!text || isLoading || !hydrated || sendingRef.current) return;
    sendingRef.current = true;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    // 입력창은 성공할 때까지 비우지 않는다.
    setPendingText(text);
    setError(null);
    setFailedSend(null);
    setIsLoading(true);

    try {
      const data = await sendChat(villager.id, [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ]);
      const villagerMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.reply,
        translation: data.translation || undefined,
        translationFailed: !data.translation,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage, villagerMessage]);
      setInput("");
      if (inputRef.current) inputRef.current.value = "";
      onExchange?.(userMessage.content, data.reply);
      if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(villagerMessage.content);
        utterance.lang = "ja-JP";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      // 실패한 말은 기록에 넣지 않고 입력창에 돌려놓는다 (음성으로 보낸 말도 같다).
      setInput(text);
      if (inputRef.current) inputRef.current.value = text;
      setFailedSend({
        text,
        message: err instanceof GeminiError ? err.message : "문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      sendingRef.current = false;
      setPendingText(null);
      setIsLoading(false);
    }
  }, [input, isLoading, hydrated, messages, villager.id, onExchange]);

  // 번역 자리에서만 다시 시도한다. 본 응답은 건드리지 않는다.
  async function retryTranslation(m: ChatMessage) {
    if (translating.has(m.id)) return;
    setTranslating((prev) => new Set(prev).add(m.id));
    try {
      const translation = await translateText(m.content);
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, translation, translationFailed: false } : x)),
      );
      setShownTranslations((prev) => new Set(prev).add(m.id));
    } catch {
      // 실패하면 "번역 실패 · 다시 시도"가 그대로 남는다.
    } finally {
      setTranslating((prev) => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
    }
  }

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);

    const recognition = new Ctor();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) sendMessageRef.current(transcript);
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicBlocked(true);
      } else if (event.error === "no-speech") {
        setError("목소리가 들리지 않았어요. 마이크 버튼을 누르고 바로 말해보세요.");
      } else if (event.error === "audio-capture") {
        setError("마이크 장치를 찾을 수 없어요. 마이크 연결과 시스템 입력 장치를 확인해주세요.");
      } else if (event.error === "network") {
        setError("음성 인식 서버에 연결하지 못했어요. 인터넷 연결을 확인하거나 Chrome에서 시도해보세요.");
      } else if (event.error !== "aborted") {
        setError(`음성 인식에 실패했어요 (${event.error}). 텍스트로 계속 대화할 수 있어요.`);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  function toggleRecording() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setError(null);
      try {
        recognition.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  }

  function toggleTranslation(id: string) {
    setShownTranslations((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function handleWordClick(word: string, x: number, y: number) {
    const alreadyAdded = words.some((w) => w.word === word);
    setPopup({ word, x, y, alreadyAdded });
  }

  // 목록에는 바로 반영하고 서버에 저장한다. 실패하면 되돌리고 에러를 보여준다.
  async function handleAddWord(word: string) {
    if (words.some((w) => w.word === word)) return;
    setWords((prev) => [...prev, { word, addedAt: Date.now() }]);
    try {
      const saved = await addWord(word);
      setWords((prev) => prev.map((w) => (w.word === word ? saved : w)));
    } catch (err) {
      setWords((prev) => prev.filter((w) => w.word !== word));
      setError(err instanceof Error ? err.message : "단어를 저장하지 못했습니다.");
    }
  }

  return (
    <div className={onClose ? "page modalPage" : "page"}>
      <header className="header">
        <div className="villagerInfo">
          <VillagerFace villagerId={villager.id} />
          <div>
            <div className="villagerName">{villager.name}</div>
            <div className="villagerDesc">{villager.description}</div>
          </div>
        </div>
        <div className="headerActions">
          <Link href="/villagers" className="pill">
            주민 목록
          </Link>
          <Link href="/words" className="pill">
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
            className={
              m.role === "user"
                ? "bubbleUser"
                : blurReplies && !revealed.has(m.id)
                  ? "bubbleVillager bubbleBlurred"
                  : "bubbleVillager"
            }
            title={m.role !== "user" && blurReplies && !revealed.has(m.id) ? "눌러서 문장 보기" : undefined}
            onClickCapture={(e) => {
              // 듣기 연습 중 가려진 말은 먼저 눌러서 보이게 한다(단어 탭은 그다음)
              if (m.role !== "user" && blurReplies && !revealed.has(m.id)) {
                e.stopPropagation();
                e.preventDefault();
                setRevealed((prev) => new Set(prev).add(m.id));
              }
            }}
          >
            {m.role === "assistant" ? (
              <>
                <VillagerMessage text={m.content} onWordClick={handleWordClick} />
                {!m.translation && m.translationFailed && (
                  <button
                    type="button"
                    className="translationToggle"
                    disabled={translating.has(m.id)}
                    onClick={() => retryTranslation(m)}
                  >
                    {translating.has(m.id) ? "번역 중..." : "번역 실패 · 다시 시도"}
                  </button>
                )}
                {m.translation && (
                  <>
                    <button
                      type="button"
                      className="translationToggle"
                      aria-expanded={shownTranslations.has(m.id)}
                      onClick={() => toggleTranslation(m.id)}
                    >
                      {shownTranslations.has(m.id) ? "번역 숨기기" : "번역 보기"}
                    </button>
                    {shownTranslations.has(m.id) && (
                      <div className="translationText">{m.translation}</div>
                    )}
                  </>
                )}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        {pendingText !== null && <div className="bubbleUser">{pendingText}</div>}
        {isLoading && (
          <div className="bubbleVillager bubbleLoading">
            {slowConnection ? "연결 중... 잠시만 기다려 주세요" : `${villager.name}가 답하는 중...`}
          </div>
        )}
        <div ref={logEndRef} />
      </main>

      {error && <p className="errorText">{error}</p>}
      {failedSend && !isLoading && (
        <p className="errorText" role="alert">
          {failedSend.message}{" "}
          <button type="button" className="pill" onClick={() => sendMessage(failedSend.text)}>
            다시 시도
          </button>
        </p>
      )}

      {(!voiceSupported || micBlocked) && (
        <p className="voiceHint">
          {micBlocked
            ? "마이크 권한이 거부되어 음성 입력을 사용할 수 없어요. 아래 텍스트로 계속 대화할 수 있어요."
            : "이 브라우저는 음성 대화를 지원하지 않아요. 아래 텍스트로 계속 대화할 수 있어요."}
        </p>
      )}

      {hint && <p className="voiceHint chatHint">{hint}</p>}

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
        <button
          type="button"
          className={isRecording ? "micButton micButtonActive" : "micButton"}
          onClick={toggleRecording}
          disabled={!voiceSupported || micBlocked || isLoading}
          aria-pressed={isRecording}
          aria-label={isRecording ? "녹음 종료" : "음성으로 말하기"}
          title={isRecording ? "녹음 종료" : "음성으로 말하기"}
        >
          {isRecording ? "⏹" : "🎤"}
        </button>
        <input
          ref={inputRef}
          className="textInput"
          defaultValue=""
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={
            isRecording ? "듣고 있어요..." : "일본어로 메시지를 입력하세요..."
          }
          disabled={isLoading || isRecording}
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
