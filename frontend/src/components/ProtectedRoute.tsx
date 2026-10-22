import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';

type Status = 'checking' | 'authenticated' | 'unauthenticated';

/** 로그인해야 접근 가능한 라우트를 감싼다. 로그인 여부는 `/api/auth/me` 호출로 확인한다. */
function ProtectedRoute() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then(() => {
        if (!cancelled) {
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return null;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
