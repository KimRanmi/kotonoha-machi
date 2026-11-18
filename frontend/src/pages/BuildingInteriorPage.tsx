import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getAvatarOptions, getProfile, type Avatar } from '../api/user';
import { getVillageBuildings, type VillageBuilding } from '../api/village';
import InteriorScene from '../components/InteriorScene';
import Joystick from '../components/Joystick';
import ResidentChatModal from '../components/ResidentChatModal';
import { avatarFromProfile, buildAvatarPalette, type AvatarPalette } from '../lib/avatarPreview';
import { getBuildingInterior } from '../lib/buildingInteriors';
import { useFriendships } from '../hooks/useFriendships';
import { VILLAGE_RESIDENTS } from '../lib/villageResidents';
import styles from './BuildingInteriorPage.module.css';

/** 건물 안. 꾸며진 방을 걸어다니며 안에 있는 주민에게 말을 걸고, 현관에서 마을로 나간다. */
function BuildingInteriorPage() {
  const navigate = useNavigate();
  const { buildingId } = useParams<{ buildingId: string }>();
  const [buildings, setBuildings] = useState<VillageBuilding[] | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [palette, setPalette] = useState<AvatarPalette | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [nearResidentSlug, setNearResidentSlug] = useState<string | null>(null);
  const [nearExit, setNearExit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 방을 그리려면 건물 정보와 내 캐릭터 생김새가 모두 있어야 한다.
    Promise.all([getVillageBuildings(), getProfile(), getAvatarOptions()])
      .then(([loadedBuildings, profile, options]) => {
        if (!cancelled) {
          setBuildings(loadedBuildings);
          setPalette(buildAvatarPalette(options));
          setAvatar(avatarFromProfile(profile));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : '건물을 불러오지 못했습니다.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const building = buildings?.find((candidate) => candidate.id === buildingId);
  // 이 건물에 속한 주민들. building이 바뀔 때만 새로 만들어야 장면을 다시 만들지 않는다.
  const residents = useMemo(
    () =>
      (building?.residentSlugs ?? [])
        .map((slug) => VILLAGE_RESIDENTS.find((candidate) => candidate.slug === slug))
        .filter((candidate) => candidate !== undefined),
    [building],
  );
  const nearResident = residents.find((candidate) => candidate.slug === nearResidentSlug) ?? null;
  // 대화창이 열린 주민. 페이지를 이동하지 않고 방 위에 모달로 띄운다.
  const [chatResidentSlug, setChatResidentSlug] = useState<string | null>(null);
  const chatResident = residents.find((candidate) => candidate.slug === chatResidentSlug) ?? null;
  const closeChat = useCallback(() => setChatResidentSlug(null), []);
  const { friendships, setFriendshipLevel } = useFriendships();
  // 같은 건물이면 같은 객체를 넘겨야 장면을 다시 만들지 않는다.
  const interior = useMemo(
    () => (buildingId ? getBuildingInterior(buildingId) : null),
    [buildingId],
  );

  // 현관 매트 위에서 Enter를 누르면 마을로 나간다.
  useEffect(() => {
    // 주민이 가까우면 대화가 먼저다(화면의 버튼도 주민이 우선). 대화창이 열려 있으면 Enter는 전송에 쓰인다.
    if (chatResident || (!nearResidentSlug && !nearExit)) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isFormControl =
        target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName);
      if (event.key !== 'Enter' || isFormControl) {
        return;
      }
      if (nearResident) {
        setChatResidentSlug(nearResident.slug);
      } else if (nearExit) {
        navigate('/town');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearResidentSlug, nearResident, nearExit, chatResident, navigate]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/town" className={styles.backLink}>
          ← 마을로
        </Link>
        {building && <h1 className={styles.title}>{building.label}</h1>}
      </header>
      {building && interior && avatar && palette && (
        <InteriorScene
          avatar={avatar}
          palette={palette}
          interior={interior}
          residents={residents}
          onNearResidentChange={setNearResidentSlug}
          onNearExitChange={setNearExit}
          friendships={friendships}
        />
      )}
      {nearResident && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setChatResidentSlug(nearResident.slug)}
        >
          {nearResident.name}と話す (Enter)
        </button>
      )}
      {!chatResident && <Joystick />}
      {chatResident && (
        <ResidentChatModal
          residentSlug={chatResident.slug}
          residentName={chatResident.name}
          voice={chatResident.voice}
          friendshipLevel={friendships[chatResident.slug] ?? 0}
          onFriendshipChange={setFriendshipLevel}
          onClose={closeChat}
        />
      )}
      {nearExit && !nearResident && (
        <button type="button" className={styles.actionButton} onClick={() => navigate('/town')}>
          外に出る (Enter)
        </button>
      )}
      {!buildings && !errorMessage && <p className={styles.content}>건물을 불러오는 중…</p>}
      {errorMessage && (
        <div className={styles.content} role="alert">
          <p>{errorMessage}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              setErrorMessage(null);
              setAttempt((previous) => previous + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {buildings && !building && (
        <p className={styles.content} role="alert">
          건물을 찾을 수 없습니다.
        </p>
      )}
    </main>
  );
}

export default BuildingInteriorPage;
