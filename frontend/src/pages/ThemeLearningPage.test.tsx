import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import ThemeLearningPage from './ThemeLearningPage';

vi.mock('../api/theme', () => ({
  getThemes: vi.fn(),
  completeStage: vi.fn(),
  getStageContent: vi.fn(),
}));

import { completeStage, getStageContent, getThemes, type Theme } from '../api/theme';

function renderPage(themeId = '11') {
  render(
    <MemoryRouter initialEntries={[`/town/themes/${themeId}`]}>
      <Routes>
        <Route path="/town/themes/:themeId" element={<ThemeLearningPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const WEATHER_THEME: Theme = {
  id: 11,
  title: '날씨',
  currentStage: 'WORD',
  completed: false,
};

describe('ThemeLearningPage', () => {
  beforeEach(() => {
    vi.mocked(getThemes).mockReset();
    vi.mocked(completeStage).mockReset();
    vi.mocked(getStageContent).mockReset();
    vi.mocked(getStageContent).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('themeId에 해당하는 테마를 찾지 못하면 안내 문구를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    renderPage('999');

    expect(await screen.findByText('테마를 찾을 수 없습니다.')).toBeInTheDocument();
  });

  it('테마 목록 조회가 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(getThemes).mockRejectedValue(new ApiError(500, '테마를 불러오지 못했습니다.'));
    renderPage();

    expect(await screen.findByText('테마를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('정상 조회 시 현재 단계가 강조된 스텝 인디케이터를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    renderPage();

    const kanjiStep = await screen.findByText('한자');
    const wordStep = screen.getByText('단어');
    const expressionStep = screen.getByText('표현');

    expect(kanjiStep).toHaveAttribute('data-active', 'true');
    expect(wordStep).toHaveAttribute('data-active', 'true');
    expect(expressionStep).toHaveAttribute('data-active', 'false');
  });

  it('현재 단계의 실제 콘텐츠와 JLPT 레벨을 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([
      { surfaceForm: '混雑', reading: 'こんざつ', meaning: '혼잡함', jlptLevel: 2 },
    ]);
    renderPage();

    expect(await screen.findByText('混雑')).toBeInTheDocument();
    expect(screen.getByText('こんざつ')).toBeInTheDocument();
    expect(screen.getByText('혼잡함')).toBeInTheDocument();
    expect(screen.getByText('N2')).toBeInTheDocument();
    expect(getStageContent).toHaveBeenCalledWith(11, 'WORD');
  });

  it('콘텐츠 조회가 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockRejectedValue(
      new ApiError(500, '콘텐츠를 불러오지 못했습니다.'),
    );
    renderPage();

    expect(await screen.findByText('콘텐츠를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('독해(READING) 단계는 콘텐츠 API를 호출하지 않고 준비 중 문구를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'READING' }]);
    renderPage();

    expect(await screen.findByText('콘텐츠 준비 중입니다.')).toBeInTheDocument();
    expect(getStageContent).not.toHaveBeenCalled();
  });

  it('힌트 버튼은 항상 disabled 상태다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    renderPage();

    const hintButton = await screen.findByRole('button', { name: '힌트' });
    expect(hintButton).toBeDisabled();
  });

  it('다음 버튼을 누르면 completeStage가 올바른 인자로 호출되고 응답으로 상태를 갱신한다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(completeStage).mockResolvedValue({
      themeId: 11,
      currentStage: 'EXPRESSION',
      completed: false,
    });
    renderPage();

    const nextButton = await screen.findByRole('button', { name: '다음' });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(completeStage).toHaveBeenCalledWith(11, 'WORD');
    });

    const expressionStep = await screen.findByText('표현');
    expect(expressionStep).toHaveAttribute('data-active', 'true');
    const readingStep = screen.getByText('독해');
    expect(readingStep).toHaveAttribute('data-active', 'false');
  });

  it('completeStage가 실패하면 에러 메시지를 보여주고 단계는 그대로 유지된다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(completeStage).mockRejectedValue(new ApiError(409, '이미 완료된 단계입니다.'));
    renderPage();

    const nextButton = await screen.findByRole('button', { name: '다음' });
    fireEvent.click(nextButton);

    expect(await screen.findByText('이미 완료된 단계입니다.')).toBeInTheDocument();
    const wordStep = screen.getByText('단어');
    expect(wordStep).toHaveAttribute('data-active', 'true');
    const expressionStep = screen.getByText('표현');
    expect(expressionStep).toHaveAttribute('data-active', 'false');
  });

  it('completed가 true가 되면 완료 문구와 마을로 돌아가기 링크를 보여주고 다음 버튼은 사라진다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'READING' }]);
    vi.mocked(completeStage).mockResolvedValue({
      themeId: 11,
      currentStage: 'READING',
      completed: true,
    });
    renderPage();

    const nextButton = await screen.findByRole('button', { name: '다음' });
    fireEvent.click(nextButton);

    expect(await screen.findByText('테마를 모두 완료했습니다!')).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: '마을로 돌아가기' });
    expect(backLink).toHaveAttribute('href', '/town');
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
  });
});
