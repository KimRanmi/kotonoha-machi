import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { ApiError, oauth2AuthorizationUrl } from '../api/client';
import SocialIcon from '../components/SocialIcon';
import styles from './AuthPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/town');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>로그인</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          )}
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            로그인
          </button>
        </form>
        <div className={styles.divider}>
          <span>또는</span>
        </div>
        <div className={styles.socialButtons}>
          <a
            className={styles.socialButton}
            data-provider="google"
            href={oauth2AuthorizationUrl('google')}
          >
            <SocialIcon provider="google" />
            Google로 계속하기
          </a>
          <a
            className={styles.socialButton}
            data-provider="kakao"
            href={oauth2AuthorizationUrl('kakao')}
          >
            <SocialIcon provider="kakao" />
            카카오로 계속하기
          </a>
          <a
            className={styles.socialButton}
            data-provider="naver"
            href={oauth2AuthorizationUrl('naver')}
          >
            <SocialIcon provider="naver" />
            네이버로 계속하기
          </a>
        </div>
        <p className={styles.footer}>
          <Link to="/password-reset">비밀번호를 잊으셨나요?</Link>
        </p>
        <p className={styles.footer}>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </main>
  );
}

export default LoginPage;
