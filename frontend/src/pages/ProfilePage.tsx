import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword, getProfile, updateNickname, withdraw } from '../api/user';
import { ApiError } from '../api/client';
import styles from './AuthPage.module.css';

function ProfilePage() {
  const navigate = useNavigate();
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

  const [withdrawCurrentPassword, setWithdrawCurrentPassword] = useState('');
  const [isWithdrawConfirming, setIsWithdrawConfirming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawErrorMessage, setWithdrawErrorMessage] = useState<string | null>(null);

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

  async function handleWithdrawSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isWithdrawConfirming) {
      setIsWithdrawConfirming(true);
      return;
    }

    setWithdrawErrorMessage(null);
    setIsWithdrawing(true);

    try {
      await withdraw(withdrawCurrentPassword);
      navigate('/login');
    } catch (error) {
      setWithdrawErrorMessage(
        error instanceof ApiError ? error.message : '회원 탈퇴에 실패했습니다.',
      );
    } finally {
      setIsWithdrawing(false);
    }
  }

  function handleWithdrawCancel() {
    setIsWithdrawConfirming(false);
    setWithdrawErrorMessage(null);
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

        <h2>회원 탈퇴</h2>
        <form onSubmit={handleWithdrawSubmit}>
          {!hasPassword && (
            <span className={styles.hint} data-tone="muted">
              소셜 로그인으로 가입한 계정이라 비밀번호 확인 없이 탈퇴됩니다.
            </span>
          )}
          {hasPassword && (
            <div className={styles.field}>
              <label htmlFor="withdrawCurrentPassword">현재 비밀번호 확인</label>
              <input
                id="withdrawCurrentPassword"
                type="password"
                value={withdrawCurrentPassword}
                onChange={(event) => setWithdrawCurrentPassword(event.target.value)}
                minLength={8}
                maxLength={100}
                required
              />
            </div>
          )}
          {isWithdrawConfirming && (
            <span className={styles.hint} data-tone="error">
              정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </span>
          )}
          {withdrawErrorMessage && (
            <p className={styles.error} role="alert">
              {withdrawErrorMessage}
            </p>
          )}
          <button type="submit" className={styles.secondaryButton} disabled={isWithdrawing}>
            {isWithdrawConfirming ? '탈퇴 확정' : '탈퇴하기'}
          </button>
          {isWithdrawConfirming && (
            <button type="button" className={styles.secondaryButton} onClick={handleWithdrawCancel}>
              취소
            </button>
          )}
        </form>
      </div>
    </main>
  );
}

export default ProfilePage;
