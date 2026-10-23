import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import TownPage from './TownPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/auth', () => ({
  logout: vi.fn(),
}));

vi.mock('../api/user', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../api/theme', () => ({
  getThemes: vi.fn(),
}));

import { logout } from '../api/auth';
import { getProfile } from '../api/user';
import { getThemes } from '../api/theme';

function renderPage() {
  render(
    <MemoryRouter>
      <TownPage />
    </MemoryRouter>,
  );
}

describe('TownPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    vi.mocked(logout).mockReset();
    vi.mocked(getProfile).mockReset();
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'haru@example.com',
      nickname: '하루',
      hasPassword: true,
      avatarSkinColor: 'LIGHT',
      avatarHairColor: 'BLACK',
      avatarHairStyle: 'SHORT',
      avatarClothesStyle: 'PLAIN',
      avatarShoesColor: 'WHITE',
    });
    vi.mocked(getThemes).mockReset();
    vi.mocked(getThemes).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('로그아웃에 성공하면 /login으로 이동한다', async () => {
    vi.mocked(logout).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('로그아웃에 실패하면 에러 메시지를 보여주고 이동하지 않는다', async () => {
    vi.mocked(logout).mockRejectedValue(new ApiError(500, '로그아웃에 실패했습니다.'));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(await screen.findByText('로그아웃에 실패했습니다.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('닉네임 링크를 누르면 프로필 계정 설정으로 이동할 수 있다', async () => {
    renderPage();

    const nicknameLink = await screen.findByRole('link', { name: '하루 님' });
    expect(nicknameLink).toHaveAttribute('href', '/profile?tab=account');
  });

  it('캐릭터 썸네일을 누르면 프로필 캐릭터 설정으로 이동할 수 있다', async () => {
    renderPage();

    const characterLink = await screen.findByRole('link', { name: '캐릭터 설정' });
    expect(characterLink).toHaveAttribute('href', '/profile?tab=character');
  });

  it('완료되지 않은 테마가 있으면 오늘의 학습 배너를 보여주고 테마 학습 화면으로 연결한다', async () => {
    vi.mocked(getThemes).mockResolvedValue([
      { id: 10, title: '가족', currentStage: 'WORD', completed: true },
      { id: 11, title: '날씨', currentStage: 'KANJI', completed: false },
    ]);
    renderPage();

    const bannerLink = await screen.findByRole('link', { name: /날씨/ });
    expect(bannerLink).toHaveAttribute('href', '/town/themes/11');
    expect(screen.getByText('1순위 · 오늘의 학습')).toBeInTheDocument();
  });

  it('모든 테마를 완료했으면 오늘의 학습 배너를 보여주지 않는다', async () => {
    vi.mocked(getThemes).mockResolvedValue([
      { id: 10, title: '가족', currentStage: 'READING', completed: true },
    ]);
    renderPage();

    await screen.findByRole('link', { name: '하루 님' });
    expect(screen.queryByText('1순위 · 오늘의 학습')).not.toBeInTheDocument();
  });

  it('테마가 없으면 오늘의 학습 배너를 보여주지 않는다', async () => {
    vi.mocked(getThemes).mockResolvedValue([]);
    renderPage();

    await screen.findByRole('link', { name: '하루 님' });
    expect(screen.queryByText('1순위 · 오늘의 학습')).not.toBeInTheDocument();
  });

  it('테마 목록 조회가 실패해도 화면은 조용히 정상 동작한다', async () => {
    vi.mocked(getThemes).mockRejectedValue(new ApiError(500, '테마를 불러오지 못했습니다.'));
    renderPage();

    await screen.findByRole('link', { name: '하루 님' });
    expect(screen.queryByText('1순위 · 오늘의 학습')).not.toBeInTheDocument();
  });
});
