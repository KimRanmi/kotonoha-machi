import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import SignupPage from './SignupPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/auth', () => ({
  checkNicknameAvailability: vi.fn(),
  signup: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerificationCode: vi.fn(),
}));

import {
  checkNicknameAvailability,
  resendVerificationCode,
  signup,
  verifyEmail,
} from '../api/auth';

function renderSignupPage() {
  render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  );
}

function fillSignupForm(email: string, password: string, nickname: string) {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: nickname } });
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.mocked(checkNicknameAvailability).mockReset();
    vi.mocked(signup).mockReset();
    vi.mocked(verifyEmail).mockReset();
    vi.mocked(resendVerificationCode).mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('닉네임 입력 후 포커스를 벗어나면 사용 가능 여부를 보여준다 (사용 가능)', async () => {
    vi.mocked(checkNicknameAvailability).mockResolvedValue(true);
    renderSignupPage();

    const nicknameInput = screen.getByLabelText('닉네임');
    fireEvent.change(nicknameInput, { target: { value: '새닉네임' } });
    fireEvent.blur(nicknameInput);

    expect(await screen.findByText('사용 가능한 닉네임입니다.')).toBeInTheDocument();
    expect(checkNicknameAvailability).toHaveBeenCalledWith('새닉네임');
  });

  it('닉네임 입력 후 포커스를 벗어나면 사용 가능 여부를 보여준다 (중복)', async () => {
    vi.mocked(checkNicknameAvailability).mockResolvedValue(false);
    renderSignupPage();

    const nicknameInput = screen.getByLabelText('닉네임');
    fireEvent.change(nicknameInput, { target: { value: '중복닉네임' } });
    fireEvent.blur(nicknameInput);

    expect(await screen.findByText('이미 사용 중인 닉네임입니다.')).toBeInTheDocument();
  });

  it('닉네임을 다시 수정하면 이전 확인 결과 표시가 사라진다', async () => {
    vi.mocked(checkNicknameAvailability).mockResolvedValue(true);
    renderSignupPage();

    const nicknameInput = screen.getByLabelText('닉네임');
    fireEvent.change(nicknameInput, { target: { value: '새닉네임' } });
    fireEvent.blur(nicknameInput);
    await screen.findByText('사용 가능한 닉네임입니다.');

    fireEvent.change(nicknameInput, { target: { value: '새닉네임2' } });

    expect(screen.queryByText('사용 가능한 닉네임입니다.')).not.toBeInTheDocument();
  });

  it('회원가입에 성공하면 이메일 인증 단계로 전환된다', async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
        nickname: '닉네임',
      });
    });
    expect(await screen.findByRole('heading', { name: '이메일 인증' })).toBeInTheDocument();
  });

  it('회원가입에 실패하면 에러 메시지를 보여주고 폼 단계에 머문다', async () => {
    vi.mocked(signup).mockRejectedValue(new ApiError(409, '이미 가입된 이메일입니다.'));
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByText('이미 가입된 이메일입니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
  });

  it('이메일 인증에 성공하면 로그인 페이지로 이동한다', async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    vi.mocked(verifyEmail).mockResolvedValue(undefined);
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '이메일 인증' });

    fireEvent.change(screen.getByLabelText('인증 코드'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));

    await waitFor(() => {
      expect(verifyEmail).toHaveBeenCalledWith({ email: 'user@test.com', code: '123456' });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('이메일 인증에 실패하면 에러 메시지를 보여주고 이동하지 않는다', async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    vi.mocked(verifyEmail).mockRejectedValue(new ApiError(400, '인증 코드가 올바르지 않습니다.'));
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '이메일 인증' });

    fireEvent.change(screen.getByLabelText('인증 코드'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));

    expect(await screen.findByText('인증 코드가 올바르지 않습니다.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('인증 코드 재전송을 누르면 재전송하고 안내 메시지를 보여준다', async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    vi.mocked(resendVerificationCode).mockResolvedValue(undefined);
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '이메일 인증' });

    fireEvent.click(screen.getByRole('button', { name: '인증 코드 재전송' }));

    await waitFor(() => {
      expect(resendVerificationCode).toHaveBeenCalledWith('user@test.com');
    });
    expect(await screen.findByText('인증 코드를 다시 보냈어요.')).toBeInTheDocument();
  });

  it('인증 코드 재전송에 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    vi.mocked(resendVerificationCode).mockRejectedValue(
      new ApiError(400, '이미 인증이 완료된 계정입니다.'),
    );
    renderSignupPage();

    fillSignupForm('user@test.com', 'password123', '닉네임');
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));
    await screen.findByRole('heading', { name: '이메일 인증' });

    fireEvent.click(screen.getByRole('button', { name: '인증 코드 재전송' }));

    expect(await screen.findByText('이미 인증이 완료된 계정입니다.')).toBeInTheDocument();
  });
});
