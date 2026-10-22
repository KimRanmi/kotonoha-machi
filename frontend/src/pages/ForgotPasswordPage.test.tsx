import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import ForgotPasswordPage from './ForgotPasswordPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/auth', () => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}));

import { confirmPasswordReset, requestPasswordReset } from '../api/auth';

function renderPage() {
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(requestPasswordReset).mockReset();
    vi.mocked(confirmPasswordReset).mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('이메일을 제출하면 재설정 코드 입력 단계로 전환된다', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 코드 받기' }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith('user@test.com');
    });
    expect(await screen.findByRole('heading', { name: '비밀번호 재설정' })).toBeInTheDocument();
  });

  it('재설정 코드 요청이 실패하면 에러 메시지를 보여주고 단계에 머문다', async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(
      new ApiError(500, '서버 오류가 발생했습니다.'),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 코드 받기' }));

    expect(await screen.findByText('서버 오류가 발생했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '비밀번호 찾기' })).toBeInTheDocument();
  });

  it('코드와 새 비밀번호를 제출하면 재설정하고 로그인 페이지로 이동한다', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    vi.mocked(confirmPasswordReset).mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 코드 받기' }));
    await screen.findByRole('heading', { name: '비밀번호 재설정' });

    fireEvent.change(screen.getByLabelText('재설정 코드'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    await waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        email: 'user@test.com',
        code: '123456',
        newPassword: 'newPassword123',
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('재설정이 실패하면 에러 메시지를 보여주고 이동하지 않는다', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    vi.mocked(confirmPasswordReset).mockRejectedValue(
      new ApiError(400, '재설정 코드가 올바르지 않습니다.'),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'user@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 코드 받기' }));
    await screen.findByRole('heading', { name: '비밀번호 재설정' });

    fireEvent.change(screen.getByLabelText('재설정 코드'), { target: { value: '000000' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));

    expect(await screen.findByText('재설정 코드가 올바르지 않습니다.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
