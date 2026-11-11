import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { sendChatMessage } from '../api/chat';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakJapanese, stopSpeaking } from '../lib/speechSynthesis';
import { VILLAGE_RESIDENTS } from '../lib/villageResidents';
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
  onClose: () => void;
}

/** 마을 화면 위에 겹쳐 뜨는 주민 대화창. */
function ResidentChatModal({ residentSlug, residentName, onClose }: ResidentChatModalProps) {
  const [text, setText] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    isSupported: speechSupported,
    isListening,
    errorMessage: speechErrorMessage,
    start: startListening,
    cancel: cancelListening,
  } = useSpeechRecognition();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 대화창을 닫으면 읽던 주민 음성을 멈춘다(마이크 인식은 useSpeechRecognition이 멈춘다).
  useEffect(() => stopSpeaking, []);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSending) {
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    setLines((previous) => [...previous, { speaker: 'me', text: message }]);
    setText('');
    try {
      const answer = await sendChatMessage(residentSlug, message);
      setLines((previous) => [
        ...previous,
        { speaker: 'resident', text: answer.reply, translation: answer.translation },
      ]);
      const voice = VILLAGE_RESIDENTS.find((resident) => resident.slug === residentSlug)?.voice;
      speakJapanese(answer.reply, voice);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : '대화에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
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
            onClick={isListening ? cancelListening : handleVoiceInput}
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
