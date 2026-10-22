import { useParams } from 'react-router-dom';

function ChatPage() {
  const { residentId } = useParams<{ residentId: string }>();

  return (
    <main>
      <h1>주민과의 대화: {residentId}</h1>
    </main>
  );
}

export default ChatPage;
