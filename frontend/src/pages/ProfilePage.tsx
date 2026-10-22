import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { changePassword, getProfile, updateNickname } from '../api/user';
import { ApiError } from '../api/client';
import styles from './AuthPage.module.css';

function ProfilePage() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((profile) => {
        if (!cancelled) {
          setEmail(profile.email);
          setNickname(profile.nickname);
          setHasPassword(profile.hasPassword);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : '프로필을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const profile = await updateNickname(nickname);
      setNickname(profile.nickname);
      setSuccessMessage('닉네임을 변경했습니다.');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '닉네임 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);
    setIsPasswordSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setHasPassword(true);
      setPasswordSuccessMessage('비밀번호를 변경했습니다.');
    } catch (error) {
      setPasswordErrorMessage(
        error instanceof ApiError ? error.message : '비밀번호 변경에 실패했습니다.',
      );
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <Link to="/town" className={styles.backLink}>
            ← 마을로 돌아가기
          </Link>
          <h1>프로필 설정</h1>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link to="/town" className={styles.backLink}>
          ← 마을로 돌아가기
        </Link>
        <h1>프로필 설정</h1>
        <div className={styles.field}>
          <span>이메일</span>
          <p>{email}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              required
            />
          </div>
          {errorMessage && (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          )}
          {successMessage && <p className={styles.success}>{successMessage}</p>}
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            닉네임 저장
          </button>
        </form>

        <h2>비밀번호 변경</h2>
        <form onSubmit={handlePasswordSubmit}>
          {!hasPassword && (
            <span className={styles.hint} data-tone="muted">
              소셜 로그인으로 가입한 계정이라 바로 설정할 수 있습니다.
            </span>
          )}
          {hasPassword && (
            <div className={styles.field}>
              <label htmlFor="currentPassword">현재 비밀번호</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                minLength={8}
                maxLength={100}
                required
              />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
            />
          </div>
          {passwordErrorMessage && (
            <p className={styles.error} role="alert">
              {passwordErrorMessage}
            </p>
          )}
          {passwordSuccessMessage && <p className={styles.success}>{passwordSuccessMessage}</p>}
          <button type="submit" className={styles.submit} disabled={isPasswordSubmitting}>
            비밀번호 변경
          </button>
        </form>
      </div>
    </main>
  );
}

export default ProfilePage;
