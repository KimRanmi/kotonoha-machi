import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { sendChatMessage } from '../api/chat';
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = text.trim();
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
        <form onSubmit={handleSubmit}>
          <JapaneseInput value={text} onChange={setText} placeholder="romaji → かな" />
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
