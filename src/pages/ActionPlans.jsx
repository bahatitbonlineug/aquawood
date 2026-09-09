import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, CheckCircle, XCircle, Clock, Shield,
  Leaf, AlertTriangle, Zap, Calendar, User, FileText, ExternalLink
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import moment from 'moment';

const RISK_COLORS = {
  low: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending Review' },
  approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
};

function PlanCard({ plan, onClick }) {
  const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all border-l-4"
      style={{ borderLeftColor: plan.risk_level === 'critical' ? '#ef4444' : plan.risk_level === 'high' ? '#f97316' : plan.risk_level === 'moderate' ? '#eab308' : '#22c55e' }}
      onClick={() => onClick(plan)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-tight flex-1">{plan.title}</h3>
          <span className={cn("text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0", statusCfg.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{plan.location_name || `${plan.location?.lat?.toFixed(4)}, ${plan.location?.lng?.toFixed(4)}`}</span>
        </div>

        {plan.risk_level && (
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", RISK_COLORS[plan.risk_level])}>
            {plan.risk_level?.toUpperCase()} RISK
          </span>
        )}

        {plan.environmental_impact && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.environmental_impact}</p>
        )}

        {plan.suggested_actions?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium mb-1">Actions ({plan.suggested_actions.length}):</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {plan.suggested_actions[0]}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {moment(plan.created_date).fromNow()}
          </span>
          <span>{plan.overlay_type || 'satellite'} view</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanDetailDialog({ plan, user, onClose, onUpdate }) {
  const [notes, setNotes] = useState(plan.admin_notes || '');
  const [saving, setSaving] = useState(false);

  const handleAction = async (newStatus) => {
    setSaving(true);
    await base44.entities.ActionPlan.update(plan.id, {
      status: newStatus,
      admin_notes: notes,
      approved_by: newStatus === 'approved' ? user?.email : null,
      approved_date: newStatus === 'approved' ? new Date().toISOString() : null,
    });
    setSaving(false);
    onUpdate();
    onClose();
  };

  const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">{plan.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={cn("text-xs px-2 py-1 rounded-full flex items-center gap-1", statusCfg.color)}>
              <StatusIcon className="h-3 w-3" /> {statusCfg.label}
            </span>
            {plan.risk_level && (
              <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", RISK_COLORS[plan.risk_level])}>
                {plan.risk_level?.toUpperCase()} RISK
              </span>
            )}
            {plan.overlay_type && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary capitalize">
                {plan.overlay_type} overlay
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-5">
            {/* Location */}
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Location
              </p>
              <p className="text-sm font-medium">{plan.location_name}</p>
              {plan.location?.lat && (
                <>
                  <p className="text-xs font-mono text-muted-foreground">
                    {plan.location.lat.toFixed(6)}, {plan.location.lng.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${plan.location.lat},${plan.location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline mt-1"
                  >
                    Open in Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>

            {/* Environmental Impact */}
            {plan.environmental_impact && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Leaf className="h-3.5 w-3.5" /> Environmental Impact
                </p>
                <p className="text-sm leading-relaxed">{plan.environmental_impact}</p>
              </div>
            )}

            {/* Risk Mitigation */}
            {plan.risk_mitigation && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Risk Mitigation
                </p>
                <p className="text-sm leading-relaxed">{plan.risk_mitigation}</p>
              </div>
            )}

            {/* Suggested Actions */}
            {plan.suggested_actions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Suggested Actions
                </p>
                <ul className="space-y-2">
                  {plan.suggested_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full AI Analysis */}
            <div className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-primary/5 border-b flex items-center gap-2">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
                  alt="AQUA WOOD AI" className="h-5 w-5 rounded-full object-cover"
                />
                <p className="text-sm font-semibold">Full AQUA WOOD AI Analysis</p>
              </div>
              <div className="p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-1.5 text-sm leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="ml-4 list-disc my-1.5">{children}</ul>,
                      li: ({ children }) => <li className="my-0.5 text-sm">{children}</li>,
                      h2: ({ children }) => <p className="font-bold text-sm mt-3 mb-1">{children}</p>,
                    }}
                  >{plan.full_analysis}</ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Admin info */}
            {plan.approved_by && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {plan.status === 'approved' ? 'Approved' : 'Reviewed'} by {plan.approved_by}
                {plan.approved_date && ` · ${moment(plan.approved_date).format('MMM D, YYYY')}`}
              </div>
            )}

            {/* Admin Actions */}
            {user?.role === 'admin' && plan.status === 'pending' && (
              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Admin Review
                </p>
                <Textarea
                  placeholder="Add review notes (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleAction('approved')}
                    disabled={saving}
                  >
                    <CheckCircle className="h-4 w-4" /> Approve Plan
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => handleAction('rejected')}
                    disabled={saving}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            )}

            {plan.admin_notes && (
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Notes</p>
                <p className="text-sm">{plan.admin_notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function ActionPlans() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const loadData = async () => {
    const [userData, plansData] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.ActionPlan.list('-created_date', 100),
    ]);
    setUser(userData);
    setPlans(plansData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const pending = plans.filter(p => p.status === 'pending');
  const approved = plans.filter(p => p.status === 'approved');
  const rejected = plans.filter(p => p.status === 'rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Action Plans
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-generated environmental action plans from Live Map analysis · {plans.length} total
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { label: 'Pending Review', count: pending.length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
          { label: 'Approved', count: approved.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Rejected', count: rejected.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' },
        ].map(s => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="p-4 text-center">
              <p className={cn("text-3xl font-bold", s.color)}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5" /> Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1 text-xs sm:text-sm">
            <CheckCircle className="h-3.5 w-3.5" /> Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1 text-xs sm:text-sm">
            <XCircle className="h-3.5 w-3.5" /> Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: 'pending', data: pending },
          { key: 'approved', data: approved },
          { key: 'rejected', data: rejected },
        ].map(({ key, data }) => (
          <TabsContent key={key} value={key} className="mt-4">
            {data.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No {key} action plans</p>
                <p className="text-sm mt-1">Use the Live Map's click-to-analyze feature to generate plans</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map(plan => (
                  <PlanCard key={plan.id} plan={plan} onClick={setSelectedPlan} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selectedPlan && (
        <PlanDetailDialog
          plan={selectedPlan}
          user={user}
          onClose={() => setSelectedPlan(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}