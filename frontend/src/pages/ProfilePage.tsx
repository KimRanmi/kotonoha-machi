import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getAvatarOptions,
  getProfile,
  updateAvatar,
  updateNickname,
  withdraw,
  type Avatar,
  type AvatarOptions,
  type ColorOption,
} from '../api/user';
import { ApiError } from '../api/client';
import AvatarPreview from '../components/AvatarPreview';
import {
  avatarFromProfile,
  buildAvatarPalette,
  CLOTHES_STYLE_LABELS,
  HAIR_STYLE_LABELS,
} from '../lib/avatarPreview';
import styles from './ProfilePage.module.css';

type Section = 'character' | 'account';

function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSection: Section = searchParams.get('tab') === 'account' ? 'account' : 'character';
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptions | null>(null);
  const avatarPalette = useMemo(
    () => (avatarOptions ? buildAvatarPalette(avatarOptions) : null),
    [avatarOptions],
  );
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [avatarErrorMessage, setAvatarErrorMessage] = useState<string | null>(null);

  const [isWithdrawConfirming, setIsWithdrawConfirming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawErrorMessage, setWithdrawErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getProfile(), getAvatarOptions()])
      .then(([profile, options]) => {
        if (!cancelled) {
          setEmail(profile.email);
          setNickname(profile.nickname);
          setAvatar(avatarFromProfile(profile));
          setAvatarOptions(options);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadErrorMessage(
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

  function handleAvatarFieldChange<K extends keyof Avatar>(axis: K, value: Avatar[K]) {
    setAvatar((current) => (current ? { ...current, [axis]: value } : current));
  }

  async function handleAvatarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!avatar) {
      return;
    }

    setAvatarErrorMessage(null);
    setIsAvatarSubmitting(true);

    try {
      await updateAvatar(avatar);
      navigate('/town');
    } catch (error) {
      setAvatarErrorMessage(
        error instanceof ApiError ? error.message : '캐릭터 꾸미기 저장에 실패했습니다.',
      );
      setIsAvatarSubmitting(false);
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
      await withdraw();
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

  function renderColorAxis<K extends 'skinColor' | 'hairColor' | 'clothesColor' | 'shoesColor'>(
    axis: K,
    legend: string,
    options: ColorOption<Avatar[K]>[],
  ) {
    if (!avatar) {
      return null;
    }

    return (
      <div className={styles.axisRow}>
        <span className={styles.axisLabel}>{legend}</span>
        <div className={styles.swatchGroup} role="radiogroup" aria-label={legend}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={avatar[axis] === option.value}
              aria-label={option.label}
              title={option.label}
              className={styles.swatch}
              data-selected={avatar[axis] === option.value ? '' : undefined}
              style={{ backgroundColor: `#${option.hex}` }}
              onClick={() => handleAvatarFieldChange(axis, option.value)}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderStyleAxis<K extends 'hairStyle' | 'clothesStyle'>(
    axis: K,
    legend: string,
    options: Avatar[K][],
    labels: Record<string, string>,
  ) {
    if (!avatar) {
      return null;
    }

    const currentIndex = options.indexOf(avatar[axis]);

    function step(delta: number) {
      const nextIndex = (currentIndex + delta + options.length) % options.length;
      handleAvatarFieldChange(axis, options[nextIndex]);
    }

    return (
      <div className={styles.axisRow}>
        <span className={styles.axisLabel}>{legend}</span>
        <div className={styles.stepper}>
          <button
            type="button"
            aria-label={`이전 ${legend}`}
            className={styles.stepperArrow}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <span className={styles.stepperValue}>{labels[String(avatar[axis])]}</span>
          <button
            type="button"
            aria-label={`다음 ${legend}`}
            className={styles.stepperArrow}
            onClick={() => step(1)}
          >
            ›
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <Link to="/town" className={styles.backLink}>
            ← 마을로 돌아가기
          </Link>
          <h1>{activeSection === 'character' ? '캐릭터 설정' : '계정 설정'}</h1>
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
        <h1>{activeSection === 'character' ? '캐릭터 설정' : '계정 설정'}</h1>

        {loadErrorMessage && (
          <p className={styles.error} role="alert">
            {loadErrorMessage}
          </p>
        )}

        {activeSection === 'character' ? (
          <>
            {avatar && avatarOptions && avatarPalette && (
              <form onSubmit={handleAvatarSubmit}>
                <AvatarPreview
                  avatar={avatar}
                  palette={avatarPalette}
                  className={styles.avatarPreview}
                />
                <div className={styles.axisList}>
                  {renderColorAxis('skinColor', '피부색', avatarOptions.skinColors)}
                  {renderColorAxis('hairColor', '머리색', avatarOptions.hairColors)}
                  {renderStyleAxis(
                    'hairStyle',
                    '헤어스타일',
                    avatarOptions.hairStyles,
                    HAIR_STYLE_LABELS,
                  )}
                  {renderStyleAxis(
                    'clothesStyle',
                    '옷',
                    avatarOptions.clothesStyles,
                    CLOTHES_STYLE_LABELS,
                  )}
                  {renderColorAxis('clothesColor', '옷 색', avatarOptions.clothesColors)}
                  {renderColorAxis('shoesColor', '신발색', avatarOptions.shoesColors)}
                </div>
                {avatarErrorMessage && (
                  <p className={styles.error} role="alert">
                    {avatarErrorMessage}
                  </p>
                )}
                <button type="submit" className={styles.submit} disabled={isAvatarSubmitting}>
                  캐릭터 꾸미기 저장
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className={styles.field}>
              <span>이메일</span>
              <p>{email}</p>
            </div>

            <h2 className={styles.sectionTitle}>닉네임</h2>
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

            <h2 className={styles.sectionTitle}>회원 탈퇴</h2>
            <form onSubmit={handleWithdrawSubmit}>
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
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleWithdrawCancel}
                >
                  취소
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default ProfilePage;
