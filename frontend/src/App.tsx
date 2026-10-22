import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ChatPage from './pages/ChatPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import ThemeLearningPage from './pages/ThemeLearningPage';
import TownPage from './pages/TownPage';
import VocabularyPage from './pages/VocabularyPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/password-reset" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/town" element={<TownPage />} />
        <Route path="/town/themes/:themeId" element={<ThemeLearningPage />} />
        <Route path="/chat/:residentId" element={<ChatPage />} />
        <Route path="/vocabulary" element={<VocabularyPage />} />
      </Route>
    </Routes>
  );
}

export default App;
