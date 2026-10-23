import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { getProfile, type Avatar } from '../api/user';
import { getThemes, type Theme } from '../api/theme';
import { ApiError } from '../api/client';
import { avatarFromProfile, buildAvatarPreviewUrl } from '../lib/avatarPreview';
import styles from './TownPage.module.css';

function TownPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [todayTheme, setTodayTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((profile) => {
        if (!cancelled) {
          setUserId(profile.id);
          setNickname(profile.nickname);
          setAvatar(avatarFromProfile(profile));
        }
      })
      .catch(() => {
        // 헤더 닉네임/캐릭터 표시는 보조 정보라 실패해도 화면을 막지 않는다.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getThemes()
      .then((themes) => {
        if (!cancelled) {
          setTodayTheme(themes.find((theme) => !theme.completed) ?? null);
        }
      })
      .catch(() => {
        // 오늘의 학습 배너는 보조 정보라 실패해도 화면을 막지 않는다.
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>ことばのまち</span>
        <div className={styles.headerActions}>
          <Link to="/profile?tab=account" className={styles.nicknameLink}>
            {nickname ? `${nickname} 님` : '프로필'}
          </Link>
          <Link
            to="/profile?tab=character"
            className={styles.avatarButton}
            aria-label="캐릭터 설정"
          >
            {avatar ? (
              <img
                src={buildAvatarPreviewUrl(avatar, String(userId ?? nickname ?? 'guest'))}
                alt="내 캐릭터"
                className={styles.avatarThumb}
                width={32}
                height={32}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </Link>
          <Link to="/vocabulary" className={styles.iconButton} aria-label="학습 단어장">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 4h12a2 2 0 0 1 2 2v14l-8-3-8 3V6a2 2 0 0 1 2-2z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </Link>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="주민 목록"
            title="준비 중입니다"
            disabled
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            로그아웃
          </button>
        </div>
      </header>
      {todayTheme && (
        <Link to={`/town/themes/${todayTheme.id}`} className={styles.todayLearningBanner}>
          <span className={styles.todayLearningText}>
            <span className={styles.todayLearningLabel}>1순위 · 오늘의 학습</span>
            <span className={styles.todayLearningTitle}>{todayTheme.title}</span>
          </span>
          <span className={styles.todayLearningCta}>시작하기 →</span>
        </Link>
      )}
      {logoutErrorMessage && (
        <p className={styles.content} role="alert">
          {logoutErrorMessage}
        </p>
      )}
    </main>
  );
}

export default TownPage;
