import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  checkNicknameAvailability,
  resendVerificationCode,
  signup,
  verifyEmail,
} from '../api/auth';
import { ApiError } from '../api/client';
import styles from './AuthPage.module.css';

type Step = 'form' | 'verify';
type NicknameStatus = 'idle' | 'checking' | 'available' | 'unavailable';

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleNicknameBlur() {
    if (!nickname) {
      setNicknameStatus('idle');
      return;
    }

    setNicknameStatus('checking');
    try {
      const available = await checkNicknameAvailability(nickname);
      setNicknameStatus(available ? 'available' : 'unavailable');
    } catch {
      setNicknameStatus('idle');
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signup({ email, password, nickname });
      setStep('verify');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '회원가입에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await verifyEmail({ email, code });
      navigate('/login');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '인증에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendClick() {
    setErrorMessage(null);
    setResendMessage(null);
    setIsResending(true);

    try {
      await resendVerificationCode(email);
      setResendMessage('인증 코드를 다시 보냈어요.');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : '인증 코드 재전송에 실패했습니다.',
      );
    } finally {
      setIsResending(false);
    }
  }

  if (step === 'verify') {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1>이메일 인증</h1>
          <p className={styles.description}>{email} 주소로 받은 인증 코드를 입력해주세요.</p>
          <form onSubmit={handleVerifySubmit}>
            <div className={styles.field}>
              <label htmlFor="code">인증 코드</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </div>
            {errorMessage && (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            )}
            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              인증 확인
            </button>
          </form>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleResendClick}
            disabled={isResending}
          >
            인증 코드 재전송
          </button>
          {resendMessage && <p className={styles.success}>{resendMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>회원가입</h1>
        <form onSubmit={handleSignupSubmit}>
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setNicknameStatus('idle');
              }}
              onBlur={handleNicknameBlur}
              required
            />
            {nicknameStatus === 'checking' && (
              <span className={styles.hint} data-tone="muted">
                확인 중...
              </span>
            )}
            {nicknameStatus === 'available' && (
              <span className={styles.hint} data-tone="success">
                사용 가능한 닉네임입니다.
              </span>
            )}
            {nicknameStatus === 'unavailable' && (
              <span className={styles.hint} data-tone="error">
                이미 사용 중인 닉네임입니다.
              </span>
            )}
          </div>
          {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          )}
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            회원가입
          </button>
        </form>
      </div>
    </main>
  );
}

export default SignupPage;
