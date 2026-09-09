import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Power, AlertTriangle, CheckCircle, Clock, User, Loader2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';
import { isSuperAdmin } from '@/lib/superAdmin';
import DataManagementPanel from '@/components/superadmin/DataManagementPanel';

export default function SuperAdminControl() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadUserAndSettings();
    const unsubscribe = base44.entities.AppSettings.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        setSettings(event.data);
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const loadUserAndSettings = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      let records = await base44.entities.AppSettings.list();
      if (records.length === 0) {
        records = [await base44.entities.AppSettings.create({
          maintenance_mode: false,
          maintenance_message: "The engine can't be reached now. Try again later.",
        })];
      }
      setSettings(records[0]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleMaintenance = async () => {
    if (!settings || toggling) return;
    setToggling(true);
    try {
      const newValue = !settings.maintenance_mode;
      const updated = await base44.entities.AppSettings.update(settings.id, {
        maintenance_mode: newValue,
        updated_by_name: user?.full_name || user?.email || 'Super Admin',
        turned_on_at: newValue ? new Date().toISOString() : settings.turned_on_at,
      });
      setSettings(updated);
    } catch (e) {
      console.error(e);
    }
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <Shield className="h-7 w-7 text-rose-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2 font-display">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This area is restricted to the app creator only.
        </p>
      </div>
    );
  }

  const isOn = settings?.maintenance_mode;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">App Control Center</h1>
          <p className="text-sm text-muted-foreground">Super Admin · System-wide controls</p>
        </div>
      </div>

      <Tabs defaultValue="maintenance">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="maintenance" className="gap-2 flex-1 sm:flex-initial">
            <Power className="h-4 w-4" />
            Maintenance Mode
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 flex-1 sm:flex-initial">
            <Database className="h-4 w-4" />
            Data Management
          </TabsTrigger>
        </TabsList>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card className="card-modern overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Power className="h-5 w-5 text-primary" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isOn ? 'on' : 'off'}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl p-5 border ${
                    isOn ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {isOn ? (
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                          <AlertTriangle className="h-7 w-7 text-amber-500 shrink-0" />
                        </motion.div>
                      ) : (
                        <CheckCircle className="h-7 w-7 text-emerald-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`font-semibold ${isOn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isOn ? 'Maintenance Mode is ACTIVE' : 'System is Operational'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isOn ? 'All non-super-admin users see the maintenance screen.' : 'All users can access the system normally.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {toggling && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                      <Switch checked={isOn || false} onCheckedChange={toggleMaintenance} disabled={toggling} />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <User className="h-3.5 w-3.5" />
                    Last Toggled By
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{settings?.updated_by_name || '—'}</p>
                </div>
                <div className="rounded-xl border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="h-3.5 w-3.5" />
                    Turned On At
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {settings?.turned_on_at ? moment(settings.turned_on_at).format('MMM D, YYYY · h:mm A') : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">What Happens When Enabled</p>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">●</span>All users except the app creator are blocked from accessing the system</li>
                  <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 shrink-0">●</span>They see an animated "The engine can't be reached now" screen with a retry option</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">●</span>The app creator retains full access to all pages and controls</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">●</span>Toggle off anytime to instantly restore access for everyone</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data">
          <DataManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}