import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import PlantDoctor from './pages/PlantDoctor';
import Backup from './pages/Backup';
import SuperAdminControl from './pages/SuperAdminControl';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import RequireAuth from '@/components/RequireAuth';
import { isSuperAdmin } from '@/lib/superAdmin';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

  // Load maintenance settings + subscribe to real-time changes,
  // but ONLY after auth is confirmed so the token is valid for the API call
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;

    const loadMaintenance = async () => {
      try {
        const records = await base44.entities.AppSettings.list();
        if (records.length > 0) {
          setMaintenanceMode(records[0].maintenance_mode || false);
        }
      } catch (e) {
        console.error('Failed to load maintenance settings:', e);
      }
      setMaintenanceLoaded(true);
    };
    loadMaintenance();

    const unsubscribe = base44.entities.AppSettings.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        setMaintenanceMode(event.data?.maintenance_mode || false);
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [isLoadingAuth, isLoadingPublicSettings]);

  // Show loading spinner while checking app public settings, auth, or maintenance status
  if (isLoadingPublicSettings || isLoadingAuth || !maintenanceLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Maintenance mode gate — takes priority over auth errors.
  // Only confirmed super admins can access; everyone else (including
  // unauthenticated users) sees the maintenance screen.
  if (maintenanceMode && !isSuperAdmin(user)) {
    return <MaintenanceScreen />;
  }

  // Handle authentication errors — only block unregistered users.
  // Unauthenticated visitors can still see public pages (Map).
  // Protected pages handle their own auth redirect via RequireAuth.
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            path === 'Map' ? (
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            ) : (
              <RequireAuth>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </RequireAuth>
            )
          }
        />
      ))}
      <Route path="/PlantDoctor" element={<RequireAuth><LayoutWrapper currentPageName="PlantDoctor"><PlantDoctor /></LayoutWrapper></RequireAuth>} />
      <Route path="/Backup" element={<RequireAuth><LayoutWrapper currentPageName="Backup"><Backup /></LayoutWrapper></RequireAuth>} />
      <Route path="/SuperAdminControl" element={<RequireAuth><LayoutWrapper currentPageName="SuperAdminControl"><SuperAdminControl /></LayoutWrapper></RequireAuth>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App