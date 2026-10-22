import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import ProfilePage from './ProfilePage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/user', () => ({
  getProfile: vi.fn(),
  getAvatarOptions: vi.fn(),
  updateNickname: vi.fn(),
  updateAvatar: vi.fn(),
  changePassword: vi.fn(),
  withdraw: vi.fn(),
}));

import {
  changePassword,
  getAvatarOptions,
  getProfile,
  updateAvatar,
  updateNickname,
  withdraw,
  type AvatarOptions,
} from '../api/user';

const DEFAULT_AVATAR = {
  avatarSkinColor: 'LIGHT' as const,
  avatarHairColor: 'BLACK' as const,
  avatarHairStyle: 'SHORT' as const,
  avatarClothesStyle: 'PLAIN' as const,
  avatarShoesColor: 'WHITE' as const,
};

const DEFAULT_AVATAR_OPTIONS: AvatarOptions = {
  skinColors: ['LIGHT', 'FAIR', 'TAN', 'BROWN', 'DARK'],
  hairColors: ['BLACK', 'BROWN', 'BLONDE', 'RED', 'GRAY'],
  hairStyles: ['SHORT', 'BOB', 'PONYTAIL', 'AFRO', 'BRAIDS', 'CURLY', 'BUNS', 'MOHAWK'],
  clothesStyles: [
    'PLAIN',
    'HOODIE',
    'JACKET',
    'COAT',
    'SUIT',
    'DRESS',
    'OVERALLS',
    'STRIPES',
    'CHECKER',
    'TIE',
  ],
  shoesColors: ['WHITE', 'BLACK', 'BROWN', 'RED', 'BLUE'],
};

/** 닉네임/비밀번호/회원탈퇴는 "계정" 설정(/profile?tab=account)에, 캐릭터 꾸미기는 "캐릭터" 설정(/profile)에 있다. */
function renderPage(section: 'character' | 'account' = 'character') {
  const initialPath = section === 'account' ? '/profile?tab=account' : '/profile';
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProfilePage />
    </MemoryRouter>,
  );
}

/** 계정 설정 로딩(닉네임 입력란이 뜸)이 끝날 때까지 기다린다. */
async function waitForAccountLoaded() {
  await screen.findByLabelText('닉네임');
}

/** 캐릭터 설정 로딩(미리보기 이미지가 뜸)이 끝날 때까지 기다린다. */
async function waitForCharacterLoaded() {
  await screen.findByAltText('캐릭터 미리보기');
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset();
    vi.mocked(getAvatarOptions).mockReset();
    vi.mocked(getAvatarOptions).mockResolvedValue(DEFAULT_AVATAR_OPTIONS);
    vi.mocked(updateNickname).mockReset();
    vi.mocked(updateAvatar).mockReset();
    vi.mocked(changePassword).mockReset();
    vi.mocked(withdraw).mockReset();
    mockNavigate.mockReset();
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
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();
    expect(screen.getByLabelText('닉네임')).toHaveValue('기존닉네임');
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
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
      ...DEFAULT_AVATAR,
    });
    vi.mocked(updateNickname).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '새닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();
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
      ...DEFAULT_AVATAR,
    });
    vi.mocked(updateNickname).mockRejectedValue(new ApiError(409, '이미 사용 중인 닉네임입니다.'));
    renderPage('account');

    await waitForAccountLoaded();
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
      ...DEFAULT_AVATAR,
    });
    vi.mocked(updateNickname).mockRejectedValue(new Error('network down'));
    renderPage('account');

    await waitForAccountLoaded();
    fireEvent.click(screen.getByRole('button', { name: '닉네임 저장' }));

    expect(await screen.findByText('닉네임 변경에 실패했습니다.')).toBeInTheDocument();
  });

  it('hasPassword가 true면 현재 비밀번호 입력란을 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();

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
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();

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
      ...DEFAULT_AVATAR,
    });
    vi.mocked(changePassword).mockResolvedValue(undefined);
    renderPage('account');

    await waitForAccountLoaded();
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
      ...DEFAULT_AVATAR,
    });
    vi.mocked(changePassword).mockRejectedValue(
      new ApiError(400, '현재 비밀번호가 올바르지 않습니다.'),
    );
    renderPage('account');

    await waitForAccountLoaded();
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

  it('hasPassword가 true면 회원 탈퇴 섹션에 현재 비밀번호 입력란이 보인다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();

    expect(screen.getByLabelText('현재 비밀번호 확인')).toBeInTheDocument();
    expect(
      screen.queryByText('소셜 로그인으로 가입한 계정이라 비밀번호 확인 없이 탈퇴됩니다.'),
    ).not.toBeInTheDocument();
  });

  it('hasPassword가 false면 회원 탈퇴 섹션에 입력란 없이 안내 문구만 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: false,
      ...DEFAULT_AVATAR,
    });
    renderPage('account');

    await waitForAccountLoaded();

    expect(screen.queryByLabelText('현재 비밀번호 확인')).not.toBeInTheDocument();
    expect(
      screen.getByText('소셜 로그인으로 가입한 계정이라 비밀번호 확인 없이 탈퇴됩니다.'),
    ).toBeInTheDocument();
  });

  it('탈퇴하기를 누르면 확인 단계가 나타나고, 최종 확인을 누르면 탈퇴 후 로그인 화면으로 이동한다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(withdraw).mockResolvedValue(undefined);
    renderPage('account');

    await waitForAccountLoaded();
    fireEvent.change(screen.getByLabelText('현재 비밀번호 확인'), {
      target: { value: 'myPassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

    expect(
      await screen.findByText('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.'),
    ).toBeInTheDocument();
    expect(withdraw).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));

    await waitFor(() => {
      expect(withdraw).toHaveBeenCalledWith('myPassword123');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('비밀번호 없는 계정은 확인 없이 빈 문자열로 탈퇴를 요청한다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: false,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(withdraw).mockResolvedValue(undefined);
    renderPage('account');

    await waitForAccountLoaded();
    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));

    await waitFor(() => {
      expect(withdraw).toHaveBeenCalledWith('');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('탈퇴에 실패하면 에러 메시지를 보여주고 이동하지 않는다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(withdraw).mockRejectedValue(new ApiError(400, '현재 비밀번호가 올바르지 않습니다.'));
    renderPage('account');

    await waitForAccountLoaded();
    fireEvent.change(screen.getByLabelText('현재 비밀번호 확인'), {
      target: { value: 'wrongPassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));

    expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    // 실패했으니 입력값은 그대로 남아있어야 한다.
    expect(screen.getByLabelText('현재 비밀번호 확인')).toHaveValue('wrongPassword');
  });

  it('기본 탭은 캐릭터 설정이다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage();

    await waitForCharacterLoaded();
    expect(screen.getByRole('heading', { name: '캐릭터 설정' })).toBeInTheDocument();
  });

  it('피부색 스와치를 클릭하면 선택된 스와치가 바뀐다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage();

    await waitForCharacterLoaded();
    const skinColorGroup = screen.getByRole('radiogroup', { name: '피부색' });
    const lightSwatch = within(skinColorGroup).getByRole('radio', { name: '연한' });
    const fairSwatch = within(skinColorGroup).getByRole('radio', { name: '밝은' });

    expect(lightSwatch).toHaveAttribute('aria-checked', 'true');
    expect(fairSwatch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(fairSwatch);

    expect(lightSwatch).toHaveAttribute('aria-checked', 'false');
    expect(fairSwatch).toHaveAttribute('aria-checked', 'true');
  });

  it('헤어스타일 스테퍼 버튼을 누르면 다음/이전 스타일로 순환한다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    renderPage();

    await waitForCharacterLoaded();
    expect(screen.getByText('숏컷')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음 헤어스타일' }));
    expect(screen.getByText('단발')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이전 헤어스타일' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 헤어스타일' }));
    expect(screen.getByText('모히칸')).toBeInTheDocument();
  });

  it('캐릭터 꾸미기를 저장하면 변경한 값으로 저장 요청을 보내고 성공 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(updateAvatar).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
      avatarSkinColor: 'FAIR',
    });
    renderPage();

    await waitForCharacterLoaded();
    const skinColorGroup = screen.getByRole('radiogroup', { name: '피부색' });
    fireEvent.click(within(skinColorGroup).getByRole('radio', { name: '밝은' }));
    fireEvent.click(screen.getByRole('button', { name: '캐릭터 꾸미기 저장' }));

    await waitFor(() => {
      expect(updateAvatar).toHaveBeenCalledWith({
        skinColor: 'FAIR',
        hairColor: 'BLACK',
        hairStyle: 'SHORT',
        clothesStyle: 'PLAIN',
        shoesColor: 'WHITE',
      });
    });
    expect(await screen.findByText('캐릭터 꾸미기를 저장했습니다.')).toBeInTheDocument();
  });

  it('캐릭터 꾸미기 저장에 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(updateAvatar).mockRejectedValue(
      new ApiError(400, '캐릭터 꾸미기 저장에 실패했습니다.'),
    );
    renderPage();

    await waitForCharacterLoaded();
    fireEvent.click(screen.getByRole('button', { name: '캐릭터 꾸미기 저장' }));

    expect(await screen.findByText('캐릭터 꾸미기 저장에 실패했습니다.')).toBeInTheDocument();
  });

  it('캐릭터 선택지 조회가 실패하면 미리보기 폼 없이 에러 메시지만 보여준다', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      nickname: '기존닉네임',
      hasPassword: true,
      ...DEFAULT_AVATAR,
    });
    vi.mocked(getAvatarOptions).mockRejectedValue(
      new ApiError(500, '선택지를 불러오지 못했습니다.'),
    );
    renderPage();

    expect(await screen.findByText('선택지를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByAltText('캐릭터 미리보기')).not.toBeInTheDocument();
  });
});
