import { useState, useEffect, createContext, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, Map, Satellite, Brain, BarChart3, FileText, Bell,
  Settings, Menu, Sun, Moon, LogOut, ChevronDown, Droplets, TreeDeciduous,
  Building2, Users, DatabaseBackup, Newspaper, Search, MessageSquare,
  Sparkles, Plus, Shield,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import AIPopup from '@/components/AIPopup';
import InstallPrompt from '@/components/InstallPrompt';
import AutoDailyLogger from '@/components/AutoDailyLogger';
import { isSuperAdmin } from '@/lib/superAdmin';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {}, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// Nav mapped to existing pages (per design labels)
const navigation = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Live Monitoring', page: 'Map', icon: Map },
  { name: 'Satellite Imagery', page: 'SatelliteMonitoring', icon: Satellite },
  { name: 'AI Detection', page: 'AIAssistant', icon: Brain },
  { name: 'Analytics', page: 'Analytics', icon: BarChart3 },
  { name: 'Reports', page: 'Reports', icon: FileText },
  { name: 'Alerts', page: 'Alerts', icon: Bell, badge: true },
  { name: 'Settings', page: 'Settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Organizations', page: 'Organizations', icon: Building2 },
  { name: 'Users', page: 'Users', icon: Users },
  { name: 'Zones', page: 'Zones', icon: TreeDeciduous },
  { name: 'Backup & Restore', page: 'Backup', icon: DatabaseBackup },
];

const superAdminNavigation = [
  { name: 'App Control', page: 'SuperAdminControl', icon: Shield },
];

const bottomNav = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Map', page: 'Map', icon: Map },
  { name: 'Reports', page: 'Reports', icon: FileText },
  { name: 'Alerts', page: 'Alerts', icon: Bell, badge: true },
];

const roleLabels = {
  admin: { label: 'Administrator', color: 'bg-rose-500' },
  organisation: { label: 'Organization', color: 'bg-sky-500' },
  community: { label: 'Community', color: 'bg-emerald-500' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
    loadAlerts();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.preferences?.theme) setTheme(userData.preferences.theme);
    } catch (e) {}
  };

  const loadAlerts = async () => {
    try {
      const alerts = await base44.entities.Alert.filter({ is_read: false });
      setUnreadAlerts(alerts.length);
    } catch (e) {}
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (user) {
      await base44.auth.updateMe({ preferences: { ...user.preferences, theme: newTheme } });
    }
  };

  const handleLogout = () => base44.auth.logout();

  const NavItem = ({ item, mobile }) => {
    const isActive = currentPageName === item.page;
    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={() => mobile && setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
          isActive
          ? "bg-brand-gradient text-white shadow-glow font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.name}</span>
        {item.badge && unreadAlerts > 0 && (
          <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {unreadAlerts > 9 ? '9+' : unreadAlerts}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-card">
      <div className="p-5 border-b border-border">
        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
            alt="AQUAWOOD Logo"
            className="h-10 w-10 object-contain rounded-lg"
          />
          <div>
            <h1 className="font-bold text-base tracking-tight font-display gradient-text">AQUAWOOD</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Group Uganda Limited</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => <NavItem key={item.name} item={item} mobile={mobile} />)}
        {(user?.role === 'admin' || isSuperAdmin(user)) && (
          <>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-2">Administration</p>
            {adminNavigation.map((item) => <NavItem key={item.name} item={item} mobile={mobile} />)}
          </>
        )}
        {isSuperAdmin(user) && (
          <>
            <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider px-3 pt-4 pb-2">Super Admin</p>
            {superAdminNavigation.map((item) => <NavItem key={item.name} item={item} mobile={mobile} />)}
          </>
        )}
      </nav>

      {/* Bottom forest widget */}
      <div className="p-3">
        <div className="relative overflow-hidden rounded-2xl p-4 text-white">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=600')" }} />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 to-emerald-700/60" />
          <div className="relative z-10">
            <p className="text-sm font-bold leading-tight">Together for a Greener Uganda</p>
            <p className="text-[11px] text-white/80 mt-1 leading-snug">Monitoring today for a sustainable tomorrow.</p>
            <Link to={createPageUrl('Feed')}>
              <button className="mt-3 text-xs font-medium bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                Learn More →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 border-r border-border hidden lg:block z-40 bg-card">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>

        {/* Main */}
        <div className="lg:ml-64">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 glass border-b border-border">
            <div className="flex items-center justify-between px-4 lg:px-6 h-16 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <h2 className="font-semibold text-base lg:text-lg font-display text-foreground truncate">
                    {greeting()}{user?.full_name ? `, ${user.full_name}` : ''} 👋
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                    Real-time environmental intelligence for Uganda
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3 py-2 flex-1 max-w-xs focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search reports, zones..."
                  className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full text-muted-foreground hover:text-primary">
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
                <Link to={createPageUrl('Alerts')}>
                  <Button variant="ghost" size="icon" className="rounded-full relative text-muted-foreground hover:text-primary">
                    <Bell className="h-5 w-5" />
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center">
                        {unreadAlerts > 9 ? '9+' : unreadAlerts}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link to={createPageUrl('AIAssistant')}>
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hidden sm:flex">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary hidden sm:flex">
                  <Sparkles className="h-5 w-5 text-primary" />
                </Button>

                {user ? (
                  <div className="flex items-center gap-2 pl-1.5 ml-1 border-l border-border">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/15 text-primary text-sm font-medium">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block">
                      <p className="text-sm font-medium leading-none text-foreground">{user.full_name || 'User'}</p>
                      <p className="text-[11px] text-muted-foreground">{roleLabels[user.role]?.label || 'Community'}</p>
                    </div>
                    <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Log out">
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => base44.auth.redirectToLogin()} size="sm">Sign In</Button>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[5000] glass border-t border-border flex items-center justify-around h-16 px-2">
          {bottomNav.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.name} to={createPageUrl(item.page)} className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5">
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-muted-foreground")}>{item.name}</span>
                {item.badge && unreadAlerts > 0 && (
                  <span className="absolute top-1 right-2 h-4 w-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <AutoDailyLogger />
        <AIPopup />
        <InstallPrompt />
      </div>
    </ThemeContext.Provider>
  );
}