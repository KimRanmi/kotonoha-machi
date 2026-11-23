import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import BuildingInteriorPage from './pages/BuildingInteriorPage';
import CompletedThemesPage from './pages/CompletedThemesPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ThemeLearningPage from './pages/ThemeLearningPage';
import TownPage from './pages/TownPage';
import VocabularyPage from './pages/VocabularyPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/town" element={<TownPage />} />
        <Route path="/town/buildings/:buildingId" element={<BuildingInteriorPage />} />
        <Route path="/town/themes" element={<CompletedThemesPage />} />
        <Route path="/town/themes/:themeId" element={<ThemeLearningPage />} />
        <Route path="/vocabulary" element={<VocabularyPage />} />
      </Route>
    </Routes>
  );
}

export default App;
