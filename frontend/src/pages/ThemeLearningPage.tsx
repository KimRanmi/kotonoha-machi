import { useParams } from 'react-router-dom';

function ThemeLearningPage() {
  const { themeId } = useParams<{ themeId: string }>();

  return (
    <main>
      <h1>테마 학습: {themeId}</h1>
    </main>
  );
}

export default ThemeLearningPage;
