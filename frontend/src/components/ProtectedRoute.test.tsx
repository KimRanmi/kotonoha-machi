import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../api/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '../api/auth';

function renderWithRoute(initialPath: string) {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<h1>로그인</h1>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/town" element={<h1>마을</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('로그인한 상태면 자식 라우트를 보여준다', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '닉네임',
    });

    renderWithRoute('/town');

    expect(await screen.findByRole('heading', { name: '마을' })).toBeInTheDocument();
  });

  it('로그인하지 않은 상태면 로그인 화면으로 보낸다', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new ApiError(401, '로그인이 필요합니다.'));

    renderWithRoute('/town');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    });
  });
});
