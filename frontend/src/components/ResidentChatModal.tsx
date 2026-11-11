import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { getChatHistory, sendChatMessage } from '../api/chat';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { cancelSpeechRecognition } from '../lib/speechRecognition';
import { speakJapanese, stopSpeaking } from '../lib/speechSynthesis';
import type { VoiceProfile } from '../lib/speechSynthesis';
import JapaneseInput from './JapaneseInput';
import styles from './ResidentChatModal.module.css';

/** 서버가 받는 메시지 최대 길이. */
const MAX_MESSAGE_LENGTH = 200;

interface ChatLine {
  speaker: 'me' | 'resident';
  text: string;
  translation?: string;
}

interface ResidentChatModalProps {
  residentSlug: string;
  residentName: string;
  /** 주민 답장을 읽을 때의 목소리. */
  voice: VoiceProfile;
  onClose: () => void;
}

/** 마을 화면 위에 겹쳐 뜨는 주민 대화창. */
function ResidentChatModal({ residentSlug, residentName, voice, onClose }: ResidentChatModalProps) {
  const [text, setText] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 열 때 이전에 나눈 대화를 불러온다. 불러오는 사이 새로 보낸 말은 그 뒤에 이어 붙는다.
  useEffect(() => {
    let cancelled = false;
    getChatHistory(residentSlug)
      .then((history) => {
        if (cancelled) {
          return;
        }
        const past: ChatLine[] = history.map((item) => ({
          speaker: item.speaker === 'PLAYER' ? 'me' : 'resident',
          text: item.text,
          translation: item.translation ?? undefined,
        }));
        setLines((previous) => [...past, ...previous]);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage('이전 대화를 불러오지 못했습니다.');
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
      speakJapanese(answer.reply, voice);
    } catch (error) {
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
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{residentName}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <ul className={styles.lines} aria-live="polite">
          {lines.map((line, index) => (
            <li key={index} className={styles.line}>
              <strong>{line.speaker === 'me' ? '나' : residentName}</strong>: {line.text}
              {line.translation && <div className={styles.translation}>{line.translation}</div>}
            </li>
          ))}
        </ul>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        {speechErrorMessage && <p role="alert">{speechErrorMessage}</p>}
        {!speechSupported && (
          <p role="alert">이 브라우저는 음성 인식을 지원하지 않습니다. Chrome에서 이용해주세요.</p>
        )}
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
      </section>
    </div>
  );
}

export default ResidentChatModal;
