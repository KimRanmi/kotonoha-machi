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

vi.mock('../lib/speechRecognition', () => ({
  isSpeechRecognitionSupported: vi.fn(),
  recognizeJapaneseSpeech: vi.fn(),
}));

import { completeStage, getStageContent, getThemes, type QuizItem, type Theme } from '../api/theme';
import { isSpeechRecognitionSupported, recognizeJapaneseSpeech } from '../lib/speechRecognition';

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

const SINGLE_QUIZ_ITEM: QuizItem = {
  prompt: '混雑',
  options: ['혼잡함', '안내', '거리'],
  correctAnswer: '혼잡함',
  jlptLevel: 2,
};

const TWO_QUIZ_ITEMS: QuizItem[] = [
  SINGLE_QUIZ_ITEM,
  {
    prompt: '満席',
    options: ['만석', '안내', '거리'],
    correctAnswer: '만석',
    jlptLevel: 2,
  },
];

const READING_QUIZ_ITEM: QuizItem = {
  prompt: '今日のカフェは混雑していて、席がなかなか空かなかった。',
  options: ['오늘 카페는 혼잡해서 자리가 나지 않았다.', '그는 길을 잃었다.'],
  correctAnswer: '오늘 카페는 혼잡해서 자리가 나지 않았다.',
  jlptLevel: 3,
};

const REVIEW_QUIZ_ITEM: QuizItem = {
  prompt: '混雑',
  options: [],
  correctAnswer: '混雑',
  jlptLevel: 2,
};

describe('ThemeLearningPage', () => {
  beforeEach(() => {
    vi.mocked(getThemes).mockReset();
    vi.mocked(completeStage).mockReset();
    vi.mocked(getStageContent).mockReset();
    vi.mocked(getStageContent).mockResolvedValue([]);
    vi.mocked(isSpeechRecognitionSupported).mockReset();
    vi.mocked(isSpeechRecognitionSupported).mockReturnValue(true);
    vi.mocked(recognizeJapaneseSpeech).mockReset();
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

  it('현재 단계의 문제와 JLPT 레벨, 보기를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    renderPage();

    expect(await screen.findByText('混雑')).toBeInTheDocument();
    expect(screen.getByText('N2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '혼잡함' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '안내' })).toBeInTheDocument();
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

  it('독해(READING) 단계도 다른 단계와 같은 방식으로 콘텐츠 API를 호출해 퀴즈를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'READING' }]);
    vi.mocked(getStageContent).mockResolvedValue([READING_QUIZ_ITEM]);
    renderPage();

    expect(await screen.findByText(READING_QUIZ_ITEM.prompt)).toBeInTheDocument();
    expect(getStageContent).toHaveBeenCalledWith(11, 'READING');
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('문제를 풀기 전에는 다음 버튼이 비활성화된다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    renderPage();

    await screen.findByText('混雑');
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it('오답을 고르면 틀렸다는 안내와 시도 횟수를 보여주고 다시 선택할 수 있다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    renderPage();

    const wrongOption = await screen.findByRole('button', { name: '안내' });
    fireEvent.click(wrongOption);

    expect(await screen.findByText('틀렸습니다. 다시 선택해보세요. (1/3)')).toBeInTheDocument();
  });

  it('3회 오답을 고르면 정답을 보여주지만 정답을 직접 선택해야 진행된다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    renderPage();

    const wrongOption = await screen.findByRole('button', { name: '안내' });
    fireEvent.click(wrongOption);
    fireEvent.click(wrongOption);
    fireEvent.click(wrongOption);

    expect(
      await screen.findByText('정답은 "혼잡함"입니다. 위에서 정답을 선택해주세요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '혼잡함' }));

    expect(await screen.findByText('정답입니다!')).toBeInTheDocument();
  });

  it('정답을 고르면 정답 안내와 완료 버튼을 보여주고, 누르면 다음 버튼이 활성화된다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    renderPage();

    const correctOption = await screen.findByRole('button', { name: '혼잡함' });
    fireEvent.click(correctOption);

    expect(await screen.findByText('정답입니다!')).toBeInTheDocument();
    const finishButton = screen.getByRole('button', { name: '완료' });

    fireEvent.click(finishButton);

    expect(
      await screen.findByText('이 단계의 문제를 모두 맞혔습니다! 아래 "다음" 버튼으로 진행하세요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('문제가 여러 개면 일부만 맞혀서는 다음 버튼이 활성화되지 않고, 전부 맞혀야 활성화된다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue(TWO_QUIZ_ITEMS);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '혼잡함' }));
    fireEvent.click(await screen.findByRole('button', { name: '다음 문제' }));

    expect(await screen.findByText('満席')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: '만석' }));
    fireEvent.click(await screen.findByRole('button', { name: '완료' }));

    expect(
      await screen.findByText('이 단계의 문제를 모두 맞혔습니다! 아래 "다음" 버튼으로 진행하세요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled();
  });

  it('다음 버튼을 누르면 completeStage가 올바른 인자로 호출되고 응답으로 상태를 갱신한다', async () => {
    vi.mocked(getThemes).mockResolvedValue([WEATHER_THEME]);
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    vi.mocked(completeStage).mockResolvedValue({
      themeId: 11,
      currentStage: 'EXPRESSION',
      completed: false,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '혼잡함' }));
    fireEvent.click(await screen.findByRole('button', { name: '완료' }));

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
    vi.mocked(getStageContent).mockResolvedValue([SINGLE_QUIZ_ITEM]);
    vi.mocked(completeStage).mockRejectedValue(new ApiError(409, '이미 완료된 단계입니다.'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '혼잡함' }));
    fireEvent.click(await screen.findByRole('button', { name: '완료' }));

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
    vi.mocked(getStageContent).mockResolvedValue([READING_QUIZ_ITEM]);
    vi.mocked(completeStage).mockResolvedValue({
      themeId: 11,
      currentStage: 'READING',
      completed: true,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: READING_QUIZ_ITEM.correctAnswer }));
    fireEvent.click(await screen.findByRole('button', { name: '완료' }));

    const nextButton = await screen.findByRole('button', { name: '다음' });
    fireEvent.click(nextButton);

    expect(await screen.findByText('테마를 모두 완료했습니다!')).toBeInTheDocument();
    const backLink = screen.getByRole('link', { name: '마을로 돌아가기' });
    expect(backLink).toHaveAttribute('href', '/town');
    expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
  });

  it('복습(REVIEW) 단계는 선택지 버튼 대신 말하기 버튼을 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'REVIEW' }]);
    vi.mocked(getStageContent).mockResolvedValue([REVIEW_QUIZ_ITEM]);
    renderPage();

    expect(await screen.findByText('混雑')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🎤 말하기' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '혼잡함' })).not.toBeInTheDocument();
    expect(getStageContent).toHaveBeenCalledWith(11, 'REVIEW');
  });

  it('따라 말한 내용이 정답과 일치하면 정답 처리되고 완료 버튼이 나타난다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'REVIEW' }]);
    vi.mocked(getStageContent).mockResolvedValue([REVIEW_QUIZ_ITEM]);
    vi.mocked(recognizeJapaneseSpeech).mockResolvedValue('混雑');
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '🎤 말하기' }));

    expect(await screen.findByText('정답입니다!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument();
  });

  it('따라 말한 내용이 다르게 인식되면 다시 말해보라는 안내를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'REVIEW' }]);
    vi.mocked(getStageContent).mockResolvedValue([REVIEW_QUIZ_ITEM]);
    vi.mocked(recognizeJapaneseSpeech).mockResolvedValue('전혀 다른 말');
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '🎤 말하기' }));

    expect(await screen.findByText('다르게 들렸습니다. 다시 말해보세요.')).toBeInTheDocument();
  });

  it('음성 인식 자체가 실패하면 에러 메시지를 보여준다', async () => {
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'REVIEW' }]);
    vi.mocked(getStageContent).mockResolvedValue([REVIEW_QUIZ_ITEM]);
    vi.mocked(recognizeJapaneseSpeech).mockRejectedValue(
      new Error('음성을 인식하지 못했습니다. 다시 시도해주세요.'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '🎤 말하기' }));

    expect(
      await screen.findByText('음성을 인식하지 못했습니다. 다시 시도해주세요.'),
    ).toBeInTheDocument();
  });

  it('음성 인식을 지원하지 않는 브라우저에서는 안내 문구를 보여주고 말하기 버튼을 비활성화한다', async () => {
    vi.mocked(isSpeechRecognitionSupported).mockReturnValue(false);
    vi.mocked(getThemes).mockResolvedValue([{ ...WEATHER_THEME, currentStage: 'REVIEW' }]);
    vi.mocked(getStageContent).mockResolvedValue([REVIEW_QUIZ_ITEM]);
    renderPage();

    await screen.findByText('混雑');
    expect(
      screen.getByText('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome에서 이용해주세요.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🎤 말하기' })).toBeDisabled();
  });
});
