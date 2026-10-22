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

import { logout } from '../api/auth';
import { getProfile } from '../api/user';

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
});
