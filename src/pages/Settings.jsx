import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle,
  ExternalLink,
  MapPin,
  Award,
  Download,
  Smartphone,
  Monitor,
  Share2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useTheme } from '../Layout';
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
    location: {
      district: '',
      region: '',
      country: 'Uganda'
    },
    expertise: [],
    preferences: {
      theme: 'light',
      notifications: true,
      email_alerts: true,
      language: 'en'
    }
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setFormData({
        phone: userData.phone || '',
        bio: userData.bio || '',
        location: userData.location || {
          district: '',
          region: '',
          country: 'Uganda'
        },
        expertise: userData.expertise || [],
        preferences: {
          theme: userData.preferences?.theme || 'light',
          notifications: userData.preferences?.notifications !== false,
          email_alerts: userData.preferences?.email_alerts !== false,
          language: userData.preferences?.language || 'en'
        }
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(formData);
      toast.success('Settings saved successfully');
      loadUser();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const handleThemeToggle = () => {
    const newTheme = formData.preferences.theme === 'light' ? 'dark' : 'light';
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, theme: newTheme }
    }));
    toggleTheme();
  };

  const roleLabels = {
    admin: { label: 'Administrator', color: 'bg-red-500', description: 'Full system access' },
    organisation: { label: 'Organization', color: 'bg-blue-500', description: 'Organization management' },
    community: { label: 'Community Member', color: 'bg-green-500', description: 'Report and view data' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your settings
            </p>
            <Button onClick={() => base44.auth.redirectToLogin()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleConfig = roleLabels[user.role] || roleLabels.community;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.full_name || 'User'}</h3>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge className={cn("mt-2", roleConfig.color)}>
                {roleConfig.label}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={user.full_name || ''} disabled className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Managed by your account</p>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user.email || ''} disabled className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Managed by your account</p>
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+256 700 000 000"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself and your environmental interests..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location in Uganda</Label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <Input
                    value={formData.location.district}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, district: e.target.value }
                    })}
                    placeholder="District (e.g., Kampala)"
                  />
                </div>
                <div>
                  <Input
                    value={formData.location.region}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, region: e.target.value }
                    })}
                    placeholder="Region (e.g., Central)"
                  />
                </div>
              </div>
            </div>
            {user.reports_submitted > 0 && (
              <div className="bg-secondary rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">Your Contribution</p>
                    <p className="text-sm text-muted-foreground">
                      {user.reports_submitted} reports submitted
                    </p>
                    {user.verified_reporter && (
                      <Badge className="mt-1 bg-green-500 text-white text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Reporter
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Role & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role & Permissions
          </CardTitle>
          <CardDescription>Your access level in AQUAWOOD</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary">
            <div className={cn("p-2 rounded-lg", roleConfig.color)}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">{roleConfig.label}</h4>
              <p className="text-sm text-muted-foreground">{roleConfig.description}</p>
              {user.role === 'admin' && (
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Manage all users and organizations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Configure monitoring zones
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Access all reports and analytics
                  </li>
                </ul>
              )}
              {user.role === 'organisation' && (
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Manage organization reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Verify community submissions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    View assigned zone analytics
                  </li>
                </ul>
              )}
              {user.role === 'community' && (
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Submit environmental reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    View public monitoring data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Receive environmental alerts
                  </li>
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {formData.preferences.theme === 'dark' ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Use dark theme for the interface</p>
              </div>
            </div>
            <Switch
              checked={formData.preferences.theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>

          <Separator />

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive in-app notifications</p>
              </div>
            </div>
            <Switch
              checked={formData.preferences.notifications}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, notifications: checked }
              }))}
            />
          </div>

          <Separator />

          {/* Email Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Alerts</p>
                <p className="text-sm text-muted-foreground">Receive critical alerts via email</p>
              </div>
            </div>
            <Switch
              checked={formData.preferences.email_alerts}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, email_alerts: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Install App Card */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-5 w-5 text-green-600" />
            Install AQUAWOOD App
          </CardTitle>
          <CardDescription>Use AQUAWOOD as a native app on any device — no app store needed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-card rounded-xl p-4 border border-green-200 text-center">
              <Smartphone className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-sm">Android</p>
              <p className="text-xs text-muted-foreground mt-1">Open in Chrome → tap <b>⋮</b> menu → <b>"Add to Home screen"</b></p>
            </div>
            <div className="bg-white dark:bg-card rounded-xl p-4 border border-green-200 text-center">
              <Share2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-semibold text-sm">iPhone / iPad</p>
              <p className="text-xs text-muted-foreground mt-1">Open in Safari → tap <b>Share</b> icon → <b>"Add to Home Screen"</b></p>
            </div>
            <div className="bg-white dark:bg-card rounded-xl p-4 border border-green-200 text-center">
              <Monitor className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-sm">Desktop (Chrome/Edge)</p>
              <p className="text-xs text-muted-foreground mt-1">Look for <b>install icon ⊕</b> in address bar or browser menu → <b>"Install"</b></p>
            </div>
          </div>
          <div className="bg-white dark:bg-card rounded-lg p-3 border text-xs text-muted-foreground flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>Once installed, AQUAWOOD works like a native app — opens full screen, works offline, and appears on your home screen / desktop with the AQUAWOOD icon.</span>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-secondary/50">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium">AQUAWOOD Environmental Monitor</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0 • Developed by THE DREAMERS</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a 
                href="https://www.thedreamers.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="mailto:info@thedreamers.org"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Contact <Mail className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}