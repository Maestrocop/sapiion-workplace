import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import CompaniesPage from './pages/CompaniesPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import InternshipDetailPage from './pages/InternshipDetailPage';
import SupervisorPortalPage from './pages/SupervisorPortalPage';
import MyInternshipPage from './pages/MyInternshipPage';
import MonitoringPage from './pages/MonitoringPage';

function isStudentOnly(user) {
  const roles = user?.roles || [];
  return roles.includes('student') && !roles.some((r) => ['admin', 'coordinator', 'teacher'].includes(r));
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={isStudentOnly(user) ? '/my-internship' : '/companies'} replace />;
}

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
            <Route path="/my-internship" element={<MyInternshipPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
          </Route>

          <Route path="/" element={<RequireAuth><HomeRedirect /></RequireAuth>} />
          <Route path="*" element={<RequireAuth><HomeRedirect /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
