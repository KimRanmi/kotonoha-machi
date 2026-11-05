import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { getAvatarOptions, getProfile, type Avatar } from '../api/user';
import { getTodayRecommendation, type Theme } from '../api/theme';
import { ApiError } from '../api/client';
import AvatarPreview from '../components/AvatarPreview';
import VillageScene from '../components/VillageScene';
import { avatarFromProfile, buildAvatarPalette, type AvatarPalette } from '../lib/avatarPreview';
import styles from './TownPage.module.css';

function TownPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [palette, setPalette] = useState<AvatarPalette | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutErrorMessage, setLogoutErrorMessage] = useState<string | null>(null);
  const [todayTheme, setTodayTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProfile(), getAvatarOptions()])
      .then(([profile, options]) => {
        if (!cancelled) {
          setPalette(buildAvatarPalette(options));
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

    getTodayRecommendation()
      .then((theme) => {
        if (!cancelled) {
          setTodayTheme(theme);
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
            {avatar && palette ? (
              <AvatarPreview
                avatar={avatar}
                palette={palette}
                variant="face"
                className={styles.avatarThumb}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </Link>
          <Link
            to="/town/themes"
            className={styles.iconButton}
            aria-label="완료한 테마"
            title="완료한 테마"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8.5 12.3l2.4 2.4 4.6-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
            <span className={styles.todayLearningLabel}>
              {todayTheme.completed ? '오늘 완료 · 복습하기' : '1순위 · 오늘의 학습'}
            </span>
            <span className={styles.todayLearningTitle}>{todayTheme.title}</span>
          </span>
          <span className={styles.todayLearningCta}>
            {todayTheme.completed ? '다시 보기 →' : '시작하기 →'}
          </span>
        </Link>
      )}
      {avatar && palette && (
        <VillageScene
          avatar={avatar}
          palette={palette}
          // 건물 id가 곧 담당 주민 id다(카페 → /chat/cafe). 주민 데이터가 생기면 이 연결을 바꾼다.
          onEnterBuilding={(buildingId) => navigate(`/chat/${buildingId}`)}
        />
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
