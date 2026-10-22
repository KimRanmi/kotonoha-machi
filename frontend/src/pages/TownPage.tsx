import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { ApiError } from '../api/client';

function TownPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);

  async function handleLogout() {
    setLogoutErrorMessage(null);
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutErrorMessage(error instanceof ApiError ? error.message : '로그아웃에 실패했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1>마을</h1>
        <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
          로그아웃
        </button>
      </header>
      {logoutErrorMessage && <p role="alert">{logoutErrorMessage}</p>}
    </main>
  );
}

export default TownPage;
