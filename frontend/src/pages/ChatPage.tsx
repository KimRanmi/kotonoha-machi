import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { sendChatMessage } from '../api/chat';
import JapaneseInput from '../components/JapaneseInput';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VILLAGE_RESIDENTS } from '../lib/villageResidents';

/** 서버가 받는 메시지 최대 길이. */
const MAX_MESSAGE_LENGTH = 200;

interface ChatLine {
  speaker: 'me' | 'resident';
  text: string;
  translation?: string;
}

function ChatPage() {
  const { residentSlug } = useParams<{ residentSlug: string }>();
  const resident = VILLAGE_RESIDENTS.find((candidate) => candidate.slug === residentSlug);
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

  if (!resident) {
    return (
      <main>
        <p role="alert">주민을 찾을 수 없습니다.</p>
        <Link to="/town">마을로 돌아가기</Link>
      </main>
    );
  }

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
      const answer = await sendChatMessage(resident.slug, message);
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

  /** 마이크로 말한 내용을 입력란에 채운다. 오인식을 고칠 수 있도록 자동 전송하지 않는다. */
  const handleVoiceInput = () => {
    startListening(setText);
  };

  return (
    <main>
      <Link to="/town">← 마을로</Link>
      <h1>{resident.name}</h1>
      <ul aria-live="polite">
        {lines.map((line, index) => (
          <li key={index}>
            <strong>{line.speaker === 'me' ? '나' : resident.name}</strong>: {line.text}
            {line.translation && <div>{line.translation}</div>}
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
    </main>
  );
}

export default ChatPage;
