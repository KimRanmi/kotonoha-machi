import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getTodayRecommendation } from '../api/theme';
import { saveChatWord } from '../api/vocabulary';
import { getChatDay, getChatDays, getChatHistory, sendChatMessage } from '../api/chat';
import type { ChatDay, ChatHistoryItem } from '../api/chat';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { cancelSpeechRecognition } from '../lib/speechRecognition';
import { speakJapanese, stopSpeaking } from '../lib/speechSynthesis';
import type { VoiceProfile } from '../lib/speechSynthesis';
import JapaneseInput from './JapaneseInput';
import styles from './ResidentChatModal.module.css';

/** 서버가 받는 메시지 최대 길이. */
const MAX_MESSAGE_LENGTH = 200;

/** 오늘의 학습을 끝내기 전에 대화를 막을 때 보여 주는 안내(서버 403 문구와 같다). */
const LESSON_REQUIRED_MESSAGE = '오늘의 학습을 먼저 끝내야 주민과 이야기할 수 있어요.';

interface ChatLine {
  speaker: 'me' | 'resident';
  text: string;
  translation?: string;
}

/** 서버의 기록 한 줄을 화면용 줄로 바꾼다. */
function toChatLine(item: ChatHistoryItem): ChatLine {
  return {
    speaker: item.speaker === 'PLAYER' ? 'me' : 'resident',
    text: item.text,
    translation: item.translation ?? undefined,
  };
}

/** 대화창이 보여 주는 화면: 오늘 대화 / 지난 대화 날짜 목록 / 고른 날의 대화. */
type View = 'today' | 'days' | 'day';

interface ResidentChatModalProps {
  residentSlug: string;
  residentName: string;
  /** 주민 답장을 읽을 때의 목소리. */
  voice: VoiceProfile;
  /** 지금 친밀도(0~100). 헤더의 하트에 보인다. */
  friendshipLevel: number;
  /** 대화로 친밀도가 바뀌면 새 값을 알린다. */
  onFriendshipChange: (residentSlug: string, level: number) => void;
  onClose: () => void;
}

/** 마을 화면 위에 겹쳐 뜨는 주민 대화창. */
function ResidentChatModal({
  residentSlug,
  residentName,
  voice,
  friendshipLevel,
  onFriendshipChange,
  onClose,
}: ResidentChatModalProps) {
  const [text, setText] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 하루 대화 상한(429)에 걸렸을 때 주민이 하는 말. 오류가 아니라 "졸려요" 연출이라 따로 둔다.
  const [sleepyMessage, setSleepyMessage] = useState<string | null>(null);
  // 오늘의 학습을 끝내기 전이라 서버가 대화를 막았을 때(403)의 안내.
  const [lessonRequiredMessage, setLessonRequiredMessage] = useState<string | null>(null);
  // 말풍선에서 드래그해 고른 단어와, "단어장에 저장" 버튼을 띄울 화면 좌표.
  const [pick, setPick] = useState<{ word: string; left: number; top: number } | null>(null);
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [wordNotice, setWordNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const navigate = useNavigate();
  // 오늘의 학습을 끝냈는지 확인한 결과. 확인 전(null)에는 입력창을 숨기고, 확인에 실패하면 서버(403)가 막는다.
  const [lessonRequired, setLessonRequired] = useState<boolean | null>(null);
  const isLessonLocked = lessonRequired === true || lessonRequiredMessage !== null;
  // 마지막 대답으로 오른 친밀도. 0이면 보여 주지 않는다.
  const [friendshipGain, setFriendshipGain] = useState(0);
  // 기록 불러오기 상태는 전송 오류와 따로 둔다(서로 덮어쓰지 않게).
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<View>('today');
  const [days, setDays] = useState<ChatDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayLines, setDayLines] = useState<ChatLine[]>([]);
  // 지난 대화 화면의 불러오기 상태(오늘 대화의 상태와 따로 둔다).
  const [isPastLoading, setIsPastLoading] = useState(false);
  const [pastErrorMessage, setPastErrorMessage] = useState<string | null>(null);
  const {
    isSupported: speechSupported,
    isListening,
    errorMessage: speechErrorMessage,
    start: startListening,
    clearError: clearSpeechError,
  } = useSpeechRecognition();
  // 전송 중복은 state가 아니라 ref로 막는다(음성 인식 콜백이 오래된 state를 들고 있을 수 있다).
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(true);
  // 지난 대화 화면의 요청 번호. 응답이 뒤바뀌어 도착해도 가장 최근 요청의 응답만 반영한다.
  const pastRequestRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 열 때 오늘의 학습을 끝냈는지 확인해, 끝내기 전이면 말하기 전에 대화를 막는다.
  useEffect(() => {
    let cancelled = false;
    getTodayRecommendation()
      .then((theme) => {
        if (!cancelled) {
          setLessonRequired(theme !== null && !theme.completed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLessonRequired(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 화면을 바꾸면 떠 있던 저장 버튼과 안내를 지운다.
  useEffect(() => {
    setPick(null);
    setWordNotice(null);
  }, [view]);

  // 열 때 이전에 나눈 대화를 불러온다. 불러오는 사이 새로 보낸 말은 그 뒤에 이어 붙는다.
  useEffect(() => {
    let cancelled = false;
    setIsHistoryLoading(true);
    setHistoryErrorMessage(null);
    getChatHistory(residentSlug)
      .then((history) => {
        if (cancelled) {
          return;
        }
        const past = history.map(toChatLine);
        setLines((previous) => [...past, ...previous]);
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryErrorMessage('이전 대화를 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [residentSlug]);

  // 대화창을 닫으면 읽던 주민 음성을 멈추고, 이후 도착하는 답장은 읽지 않는다(마이크 인식은 훅이 멈춘다).
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeaking();
    };
  }, []);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSendingRef.current) {
      return;
    }
    isSendingRef.current = true;
    setIsSending(true);
    setErrorMessage(null);
    setSleepyMessage(null);
    setLessonRequiredMessage(null);
    setFriendshipGain(0);
    clearSpeechError();
    // 듣는 중에 직접 보냈다면 마이크를 끄고, 답장 음성이 마이크로 들어가지 않게 한다.
    cancelSpeechRecognition();
    setLines((previous) => [...previous, { speaker: 'me', text: message }]);
    setText('');
    try {
      const answer = await sendChatMessage(residentSlug, message);
      if (!isMountedRef.current) {
        return;
      }
      setLines((previous) => [
        ...previous,
        { speaker: 'resident', text: answer.reply, translation: answer.translation },
      ]);
      onFriendshipChange(residentSlug, answer.friendshipLevel);
      setFriendshipGain(answer.friendshipGain);
      speakJapanese(answer.reply, { slug: residentSlug, voice });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        if (isMountedRef.current) {
          // 대답을 못 받았으니 방금 붙인 내 말풍선은 빼고, 쓴 말은 입력창에 돌려준다(그 사이 새로 쓴 글은 지키지 않는다).
          setLines((previous) => previous.slice(0, -1));
          setText((current) => current || message);
          setSleepyMessage(error.message);
        }
        return;
      }
      if (error instanceof ApiError && error.status === 403) {
        if (isMountedRef.current) {
          setLines((previous) => previous.slice(0, -1));
          setText((current) => current || message);
          setLessonRequiredMessage(error.message);
        }
        return;
      }
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : '대화에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  /** 오늘의 학습 화면으로 간다. 오늘의 학습을 못 찾으면 마을 화면으로 보낸다. */
  const goToTodayLesson = async () => {
    try {
      const today = await getTodayRecommendation();
      navigate(today ? `/town/themes/${today.id}` : '/town');
    } catch {
      navigate('/town');
    }
  };

  /** 이미 불러온 화면으로 되돌아간다. 이전 화면의 오류 문구는 남기지 않는다. */
  const goToView = (nextView: View) => {
    setPastErrorMessage(null);
    setView(nextView);
  };

  /** 창이 열려 있고 가장 최근에 보낸 지난 대화 요청일 때만 true. */
  const isCurrentPastRequest = (requestId: number) =>
    isMountedRef.current && requestId === pastRequestRef.current;

  /** 지난 대화 날짜 목록을 불러와 목록 화면으로 간다. */
  const openDays = async () => {
    // 지난 대화를 보는 동안 마이크가 켜진 채 남지 않게 한다.
    cancelSpeechRecognition();
    const requestId = ++pastRequestRef.current;
    setView('days');
    setIsPastLoading(true);
    setPastErrorMessage(null);
    try {
      const loaded = await getChatDays(residentSlug);
      if (isCurrentPastRequest(requestId)) {
        setDays(loaded);
      }
    } catch {
      if (isCurrentPastRequest(requestId)) {
        setPastErrorMessage('지난 대화를 불러오지 못했습니다.');
      }
    } finally {
      if (isCurrentPastRequest(requestId)) {
        setIsPastLoading(false);
      }
    }
  };

  /** 고른 날의 대화를 불러와 읽기 화면으로 간다. */
  const openDay = async (date: string) => {
    const requestId = ++pastRequestRef.current;
    setView('day');
    setSelectedDate(date);
    setDayLines([]);
    setIsPastLoading(true);
    setPastErrorMessage(null);
    try {
      const loaded = await getChatDay(residentSlug, date);
      if (isCurrentPastRequest(requestId)) {
        setDayLines(loaded.map(toChatLine));
      }
    } catch {
      if (isCurrentPastRequest(requestId)) {
        setPastErrorMessage('그날의 대화를 불러오지 못했습니다.');
      }
    } finally {
      if (isCurrentPastRequest(requestId)) {
        setIsPastLoading(false);
      }
    }
  };

  /** 마우스를 뗄 때, 말풍선의 일본어 글자를 드래그해 골랐다면 저장 버튼을 그 아래에 띄운다. */
  const handleSelectionEnd = () => {
    const selection = window.getSelection();
    const word = selection?.toString().trim() ?? '';
    if (!selection || selection.rangeCount === 0 || !word) {
      setPick(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const container =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    // 번역·이름처럼 일본어 본문(data-jp)이 아닌 곳을 고른 경우는 무시한다.
    if (!container?.closest('[data-jp]')) {
      setPick(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setPick({ word, left: rect.left + rect.width / 2, top: rect.bottom + 6 });
  };

  /** 고른 단어를 단어장에 저장하고 결과를 안내한다. */
  const handleSaveWord = async () => {
    if (!pick || isSavingWord) {
      return;
    }
    const { word } = pick;
    setIsSavingWord(true);
    setWordNotice(null);
    try {
      const result = await saveChatWord(word);
      if (!isMountedRef.current) {
        return;
      }
      const { surfaceForm, reading, meaning } = result.entry;
      setWordNotice({
        message: result.alreadySaved
          ? `「${surfaceForm}」은(는) 이미 단어장에 있어요.`
          : `「${surfaceForm}」(${reading}) 단어장에 저장했어요: ${meaning}`,
        isError: false,
      });
    } catch (error) {
      if (isMountedRef.current) {
        setWordNotice({
          message: error instanceof ApiError ? error.message : '단어를 저장하지 못했습니다.',
          isError: true,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSavingWord(false);
        setPick(null);
      }
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(text);
  };

  /** 마이크로 말한 내용을 바로 보낸다. 너무 길면 보내지 않고 입력란에 채워 고칠 수 있게 한다. */
  const handleVoiceInput = () => {
    // 주민 목소리가 마이크에 섞여 인식되지 않도록 읽던 음성을 먼저 멈춘다.
    stopSpeaking();
    startListening((transcript) => {
      if (transcript.trim().length > MAX_MESSAGE_LENGTH) {
        setText(transcript);
        return;
      }
      void sendMessage(transcript);
    });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${residentName}와의 대화`}
        onClick={(event) => event.stopPropagation()}
        onMouseUp={handleSelectionEnd}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{residentName}</h2>
          <span
            className={styles.friendship}
            role="img"
            aria-label={`친밀도 ${friendshipLevel} / 100`}
            title={`친밀도 ${friendshipLevel} / 100`}
          >
            <span
              className={styles.heart}
              style={{ '--fill': `${friendshipLevel}%` } as CSSProperties}
              aria-hidden="true"
            >
              ♥
            </span>
            <span className={styles.friendshipLevel}>{friendshipLevel}</span>
            {friendshipGain > 0 && <span className={styles.friendshipGain}>+{friendshipGain}</span>}
          </span>
          {view === 'today' && (
            <button type="button" className={styles.pastButton} onClick={() => void openDays()}>
              지난 대화
            </button>
          )}
          {view === 'days' && (
            <button type="button" className={styles.pastButton} onClick={() => goToView('today')}>
              ← 오늘 대화
            </button>
          )}
          {view === 'day' && (
            <button type="button" className={styles.pastButton} onClick={() => goToView('days')}>
              ← 목록
            </button>
          )}
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        {view === 'days' && (
          <>
            {isPastLoading && <p>지난 대화를 불러오는 중…</p>}
            {pastErrorMessage && <p role="alert">{pastErrorMessage}</p>}
            {!isPastLoading && !pastErrorMessage && days.length === 0 && (
              <p>지난 대화가 없습니다.</p>
            )}
            <ul className={styles.dayList}>
              {days.map((day) => (
                <li key={day.date}>
                  <button
                    type="button"
                    className={styles.dayItem}
                    onClick={() => void openDay(day.date)}
                  >
                    <span className={styles.dayDate}>
                      {day.date} · {day.lineCount}줄
                    </span>
                    <span className={styles.dayPreview}>{day.preview}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {view === 'day' && (
          <>
            <p className={styles.dayDate}>{selectedDate}</p>
            {isPastLoading && <p>불러오는 중…</p>}
            {pastErrorMessage && <p role="alert">{pastErrorMessage}</p>}
            <ul className={styles.lines}>
              {dayLines.map((line, index) => (
                <li key={index} className={styles.line}>
                  <strong>{line.speaker === 'me' ? '나' : residentName}</strong>:{' '}
                  <span data-jp>{line.text}</span>
                  {line.translation && <div className={styles.translation}>{line.translation}</div>}
                </li>
              ))}
            </ul>
          </>
        )}
        {view === 'today' && (
          <>
            <ul className={styles.lines} aria-live="polite">
              {lines.map((line, index) => (
                <li key={index} className={styles.line}>
                  <strong>{line.speaker === 'me' ? '나' : residentName}</strong>:{' '}
                  <span data-jp>{line.text}</span>
                  {line.translation && <div className={styles.translation}>{line.translation}</div>}
                </li>
              ))}
            </ul>
            {isHistoryLoading && <p>이전 대화를 불러오는 중…</p>}
            {historyErrorMessage && <p role="alert">{historyErrorMessage}</p>}
            {sleepyMessage && (
              <p className={styles.sleepyNotice} role="status">
                <strong>{residentName}</strong>: 💤 {sleepyMessage}
              </p>
            )}
            {isLessonLocked && (
              <p role="alert">
                {lessonRequiredMessage ?? LESSON_REQUIRED_MESSAGE}{' '}
                <button type="button" onClick={goToTodayLesson}>
                  오늘의 학습하러 가기
                </button>
              </p>
            )}
            {errorMessage && <p role="alert">{errorMessage}</p>}
            {speechErrorMessage && <p role="alert">{speechErrorMessage}</p>}
            {!speechSupported && (
              <p role="alert">
                이 브라우저는 음성 인식을 지원하지 않습니다. Chrome에서 이용해주세요.
              </p>
            )}
            {lessonRequired !== null && !isLessonLocked && (
              <form onSubmit={handleSubmit}>
                <JapaneseInput value={text} onChange={setText} placeholder="romaji → かな" />
                <button
                  type="button"
                  onClick={isListening ? cancelSpeechRecognition : handleVoiceInput}
                  disabled={!speechSupported || isSending}
                >
                  {isListening ? '✕ 듣기 취소' : '🎤 말하기'}
                </button>
                <button
                  type="submit"
                  disabled={isSending || !text.trim() || text.length > MAX_MESSAGE_LENGTH}
                >
                  {isSending ? '답장을 기다리는 중…' : '보내기'}
                </button>
              </form>
            )}
          </>
        )}
        {wordNotice && <p role={wordNotice.isError ? 'alert' : 'status'}>{wordNotice.message}</p>}
        {pick && (
          <button
            type="button"
            className={styles.saveWordButton}
            style={{ left: pick.left, top: pick.top }}
            // 버튼을 눌러도 드래그로 고른 선택이 풀리지 않게 한다.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void handleSaveWord()}
            disabled={isSavingWord}
          >
            {isSavingWord ? '저장 중…' : '단어장에 저장'}
          </button>
        )}
      </section>
    </div>
  );
}

export default ResidentChatModal;
