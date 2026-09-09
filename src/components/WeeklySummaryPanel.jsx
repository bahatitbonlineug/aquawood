import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Plus, X, Send, Loader2, CheckCircle, Clock, Users, RefreshCw
} from 'lucide-react';
import moment from 'moment';

export default function WeeklySummaryPanel({ reports = [], zones = [] }) {
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const configs = await base44.entities.WeeklySummaryConfig.list();
    if (configs.length > 0) {
      setConfig(configs[0]);
      setConfigId(configs[0].id);
    } else {
      const created = await base44.entities.WeeklySummaryConfig.create({
        recipient_emails: [],
        enabled: true
      });
      setConfig(created);
      setConfigId(created.id);
    }
    setLoading(false);
  };

  const addEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (config.recipient_emails?.includes(email)) return;
    const updated = [...(config.recipient_emails || []), email];
    setSaving(true);
    const saved = await base44.entities.WeeklySummaryConfig.update(configId, { recipient_emails: updated });
    setConfig(prev => ({ ...prev, recipient_emails: updated }));
    setNewEmail('');
    setSaving(false);
  };

  const removeEmail = async (email) => {
    const updated = config.recipient_emails.filter(e => e !== email);
    await base44.entities.WeeklySummaryConfig.update(configId, { recipient_emails: updated });
    setConfig(prev => ({ ...prev, recipient_emails: updated }));
  };

  const sendWeeklySummary = async () => {
    if (!config?.recipient_emails?.length) return;
    setSending(true);
    setLastResult(null);

    // Gather stats
    const now = moment();
    const weekAgo = moment().subtract(7, 'days');
    const weeklyReports = reports.filter(r => moment(r.created_date).isAfter(weekAgo));
    const criticalReports = weeklyReports.filter(r => r.severity === 'critical' || r.severity === 'high');
    const pendingReports = reports.filter(r => r.status === 'pending');
    const criticalZones = zones.filter(z => z.status === 'critical');
    const atRiskZones = zones.filter(z => z.status === 'at_risk');

    const typeCounts = weeklyReports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    // Generate AI summary
    const summaryPrompt = `You are AQUA WOOD AI, an environmental monitoring system for Uganda.

Generate a professional weekly environmental monitoring summary email body (HTML format) for the AQUAWOOD team.

Week: ${weekAgo.format('MMM D')} – ${now.format('MMM D, YYYY')}

DATA:
- Total reports this week: ${weeklyReports.length}
- Critical/High severity incidents: ${criticalReports.length}
- Pending investigation: ${pendingReports.length}
- Report breakdown by type: ${JSON.stringify(typeCounts)}
- Critical monitoring zones: ${criticalZones.map(z => z.name).join(', ') || 'None'}
- At-risk zones: ${atRiskZones.map(z => z.name).join(', ') || 'None'}
- Total active zones: ${zones.length}
- Recent critical incidents: ${criticalReports.slice(0, 3).map(r => `${r.title} (${r.location?.address?.slice(0, 40) || 'unknown location'})`).join('; ')}

Write a concise, professional HTML email body with:
1. A brief executive summary (2-3 sentences)
2. Key metrics table (this week's numbers)
3. Critical alerts that need immediate attention
4. Zone status overview
5. Recommended priority actions for the coming week
6. A closing note

Use inline styles for formatting. Keep it clean, professional, and actionable. Include the AQUAWOOD branding with green (#16a34a) as accent color.`;

    const aiSummary = await base44.integrations.Core.InvokeLLM({ prompt: summaryPrompt });

    // Send to all recipients
    let successCount = 0;
    for (const email of config.recipient_emails) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `🌿 AQUAWOOD Weekly Environmental Summary — ${now.format('MMM D, YYYY')}`,
        body: aiSummary
      });
      successCount++;
    }

    // Update last sent timestamp
    await base44.entities.WeeklySummaryConfig.update(configId, {
      last_sent: new Date().toISOString()
    });
    setConfig(prev => ({ ...prev, last_sent: new Date().toISOString() }));

    setLastResult({ success: true, count: successCount });
    setSending(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading summary settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Weekly Email Summary
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Send an AI-generated environmental summary to your team
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last sent */}
        {config?.last_sent && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
            <Clock className="h-3.5 w-3.5" />
            Last sent: {moment(config.last_sent).format('MMM D, YYYY [at] h:mm A')}
          </div>
        )}

        {/* Recipient management */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Recipients ({config?.recipient_emails?.length || 0})
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
            {config?.recipient_emails?.length > 0 ? config.recipient_emails.map(email => (
              <Badge key={email} variant="secondary" className="text-xs gap-1 pr-1">
                {email}
                <button onClick={() => removeEmail(email)} className="hover:text-destructive transition-colors ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )) : (
              <p className="text-xs text-muted-foreground italic">No recipients added yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="team@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={addEmail} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add
            </Button>
          </div>
        </div>

        {/* Success result */}
        {lastResult?.success && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" />
            Summary sent to {lastResult.count} recipient{lastResult.count !== 1 ? 's' : ''}!
          </div>
        )}

        {/* Send button */}
        <Button
          className="w-full gap-2"
          onClick={sendWeeklySummary}
          disabled={sending || !config?.recipient_emails?.length}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating & Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Weekly Summary Now
            </>
          )}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          Sends an AI-generated report covering the last 7 days of activity
        </p>
      </CardContent>
    </Card>
  );
}