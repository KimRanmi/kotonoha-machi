import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import ProfilePage from './ProfilePage';

vi.mock('../api/user', () => ({
  getProfile: vi.fn(),
  updateNickname: vi.fn(),
  changePassword: vi.fn(),
}));

import { changePassword, getProfile, updateNickname } from '../api/user';

function renderPage() {
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset();
    vi.mocked(updateNickname).mockReset();
    vi.mocked(changePassword).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('프로필을 불러오면 이메일과 닉네임을 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    renderPage();

    expect(await screen.findByText('user@test.com')).toBeInTheDocument();
    expect(screen.getByLabelText('닉네임')).toHaveValue('기존닉네임');
  });

  it('프로필 조회가 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockRejectedValue(new ApiError(401, '로그인이 필요합니다.'));
    renderPage();

    expect(await screen.findByText('로그인이 필요합니다.')).toBeInTheDocument();
  });

  it('닉네임을 변경하면 변경된 닉네임과 성공 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    vi.mocked(updateNickname).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '새닉네임',
      hasPassword: true,
    });
    renderPage();

    await screen.findByText('user@test.com');
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새닉네임' } });
    fireEvent.click(screen.getByRole('button', { name: '닉네임 저장' }));

    await waitFor(() => {
      expect(updateNickname).toHaveBeenCalledWith('새닉네임');
    });
    expect(await screen.findByText('닉네임을 변경했습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('닉네임')).toHaveValue('새닉네임');
  });

  it('이미 사용 중인 닉네임으로 변경하면 중복 에러 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    vi.mocked(updateNickname).mockRejectedValue(new ApiError(409, '이미 사용 중인 닉네임입니다.'));
    renderPage();

    await screen.findByText('user@test.com');
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '중복닉네임' } });
    fireEvent.click(screen.getByRole('button', { name: '닉네임 저장' }));

    expect(await screen.findByText('이미 사용 중인 닉네임입니다.')).toBeInTheDocument();
    // 실패했으니 입력값은 그대로 남아있어야 한다.
    expect(screen.getByLabelText('닉네임')).toHaveValue('중복닉네임');
  });

  it('ApiError가 아닌 예외가 발생하면 기본 에러 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    vi.mocked(updateNickname).mockRejectedValue(new Error('network down'));
    renderPage();

    await screen.findByText('user@test.com');
    fireEvent.click(screen.getByRole('button', { name: '닉네임 저장' }));

    expect(await screen.findByText('닉네임 변경에 실패했습니다.')).toBeInTheDocument();
  });

  it('hasPassword가 true면 현재 비밀번호 입력란을 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    renderPage();

    await screen.findByText('user@test.com');

    expect(screen.getByLabelText('현재 비밀번호')).toBeInTheDocument();
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
    expect(
      screen.queryByText('소셜 로그인으로 가입한 계정이라 바로 설정할 수 있습니다.'),
    ).not.toBeInTheDocument();
  });

  it('hasPassword가 false면 현재 비밀번호 입력란 없이 안내 문구만 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: false,
    });
    renderPage();

    await screen.findByText('user@test.com');

    expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument();
    expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
    expect(
      screen.getByText('소셜 로그인으로 가입한 계정이라 바로 설정할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('비밀번호 변경에 성공하면 입력란을 초기화하고 성공 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    vi.mocked(changePassword).mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('user@test.com');
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
      target: { value: 'oldPassword123' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith('oldPassword123', 'newPassword123');
    });
    expect(await screen.findByText('비밀번호를 변경했습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('');
    expect(screen.getByLabelText('새 비밀번호')).toHaveValue('');
  });

  it('비밀번호 변경에 실패하면 에러 메시지를 보여주고 닉네임 영역과 섞이지 않는다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
    });
    vi.mocked(changePassword).mockRejectedValue(
      new ApiError(400, '현재 비밀번호가 올바르지 않습니다.'),
    );
    renderPage();

    await screen.findByText('user@test.com');
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), {
      target: { value: 'wrongPassword' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    // 닉네임 폼에는 성공/에러 메시지가 보이지 않아야 한다.
    expect(screen.queryByText('닉네임을 변경했습니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('닉네임 변경에 실패했습니다.')).not.toBeInTheDocument();
    // 실패했으니 입력값은 그대로 남아있어야 한다.
    expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('wrongPassword');
  });
});
