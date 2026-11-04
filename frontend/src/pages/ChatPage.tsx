import { useState } from 'react';
import { useParams } from 'react-router-dom';
import JapaneseInput from '../components/JapaneseInput';

function ChatPage() {
  const { residentId } = useParams<{ residentId: string }>();
  // TODO: 대화 기능이 생기면 입력 도우미 확인용 임시 입력란을 실제 대화 입력으로 교체한다.
  const [flickText, setFlickText] = useState('');
  const [qwertyText, setQwertyText] = useState('');

  return (
    <main>
      <h1>주민과의 대화: {residentId}</h1>
      <h2>플릭 키보드</h2>
      <JapaneseInput value={flickText} onChange={setFlickText} placeholder="romaji → かな" />
      <h2>QWERTY 키보드</h2>
      <JapaneseInput
        value={qwertyText}
        onChange={setQwertyText}
        placeholder="romaji → かな"
        keyboard="qwerty"
      />
    </main>
  );
}

export default ChatPage;
