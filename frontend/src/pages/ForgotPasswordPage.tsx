import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, requestPasswordReset } from '../api/auth';
import { ApiError } from '../api/client';
import styles from './AuthPage.module.css';

type Step = 'request' | 'confirm';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setStep('confirm');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : '재설정 코드 요청에 실패했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await confirmPasswordReset({ email, code, newPassword });
      navigate('/login');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : '비밀번호 재설정에 실패했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'confirm') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1>비밀번호 재설정</h1>
          <p className={styles.description}>
            {email} 주소로 받은 코드와 새 비밀번호를 입력해주세요.
          </p>
          <form onSubmit={handleConfirmSubmit}>
            <div className={styles.field}>
              <label htmlFor="code">재설정 코드</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="newPassword">새 비밀번호</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            {errorMessage && (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            )}
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              비밀번호 재설정
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>비밀번호 찾기</h1>
        <form onSubmit={handleRequestSubmit}>
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
          {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          )}
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            재설정 코드 받기
          </button>
        </form>
        <p className={styles.footer}>
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
