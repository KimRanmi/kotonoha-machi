import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import LoginPage from './LoginPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}));

import { login } from '../api/auth';

function renderLoginPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: password } });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('로그인에 성공하면 /town으로 이동한다', async () => {
    vi.mocked(login).mockResolvedValue({ id: 1, email: 'user@test.com', nickname: '닉네임' });
    renderLoginPage();

    fillForm('user@test.com', 'password123');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/town');
    });
  });

  it('로그인에 실패하면 백엔드가 내려준 에러 메시지를 보여주고 이동하지 않는다', async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, '이메일 또는 비밀번호가 올바르지 않습니다.'),
    );
    renderLoginPage();

    fillForm('user@test.com', 'wrong-password');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(
      await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ApiError가 아닌 예외가 발생하면 기본 에러 메시지를 보여준다', async () => {
    vi.mocked(login).mockRejectedValue(new Error('network down'));
    renderLoginPage();

    fillForm('user@test.com', 'password123');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('로그인에 실패했습니다.')).toBeInTheDocument();
  });

  it('소셜 로그인 링크가 백엔드의 OAuth2 시작 주소를 가리킨다', () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: 'Google로 계속하기' })).toHaveAttribute(
      'href',
      'http://localhost:8080/oauth2/authorization/google',
    );
    expect(screen.getByRole('link', { name: '카카오로 계속하기' })).toHaveAttribute(
      'href',
      'http://localhost:8080/oauth2/authorization/kakao',
    );
    expect(screen.getByRole('link', { name: '네이버로 계속하기' })).toHaveAttribute(
      'href',
      'http://localhost:8080/oauth2/authorization/naver',
    );
  });
});
