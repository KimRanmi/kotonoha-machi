import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { getAvatarOptions, getProfile, type Avatar } from '../api/user';
import { getVillageBuildings, type VillageBuilding } from '../api/village';
import InteriorScene from '../components/InteriorScene';
import { avatarFromProfile, buildAvatarPalette, type AvatarPalette } from '../lib/avatarPreview';
import { getBuildingInterior } from '../lib/buildingInteriors';
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
  const [nearResident, setNearResident] = useState(false);
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
  }, []);

  const building = buildings?.find((candidate) => candidate.id === buildingId);
  const resident =
    VILLAGE_RESIDENTS.find((candidate) => candidate.slug === building?.residentSlug) ?? null;
  // 같은 건물이면 같은 객체를 넘겨야 장면을 다시 만들지 않는다.
  const interior = useMemo(
    () => (buildingId ? getBuildingInterior(buildingId) : null),
    [buildingId],
  );

  // 현관 매트 위에서 Enter를 누르면 마을로 나간다.
  useEffect(() => {
    if (!nearExit) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isFormControl =
        target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName);
      if (event.key === 'Enter' && !isFormControl) {
        navigate('/town');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearExit, navigate]);

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
          resident={resident}
          onNearResidentChange={setNearResident}
          onNearExitChange={setNearExit}
        />
      )}
      {resident && nearResident && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => navigate(`/chat/${resident.slug}`)}
        >
          {resident.name}と話す
        </button>
      )}
      {nearExit && !nearResident && (
        <button type="button" className={styles.actionButton} onClick={() => navigate('/town')}>
          外に出る (Enter)
        </button>
      )}
      {!buildings && !errorMessage && <p className={styles.content}>건물을 불러오는 중…</p>}
      {errorMessage && (
        <p className={styles.content} role="alert">
          {errorMessage}
        </p>
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
