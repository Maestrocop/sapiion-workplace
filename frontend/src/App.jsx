import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import CompaniesPage from './pages/CompaniesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import InternshipDetailPage from './pages/InternshipDetailPage';
import SupervisorPortalPage from './pages/SupervisorPortalPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
          <Route path="/supervisor/:token" element={<SupervisorPortalPage />} />

          <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/internships/:id" element={<InternshipDetailPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/companies" replace />} />
          <Route path="*" element={<Navigate to="/companies" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
