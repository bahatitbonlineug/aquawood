import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  BellOff,
  CheckCircle2,
  MapPin,
  Clock,
  Trash2,
  Check,
  Filter
} from 'lucide-react';
import { cn } from "@/lib/utils";
import moment from 'moment';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const userData = await base44.auth.me().catch(() => null);
      const isAdmin = userData?.role === 'admin';
      const userId = userData?.id;

      const data = isAdmin
        ? await base44.entities.Alert.list('-created_date', 100)
        : await base44.entities.Alert.filter({ created_by_id: userId }, '-created_date', 100).catch(() => []);
      setAlerts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await base44.entities.Alert.update(alertId, { is_read: true });
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter(a => !a.is_read);
      await Promise.all(unreadAlerts.map(a => 
        base44.entities.Alert.update(a.id, { is_read: true })
      ));
      loadAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await base44.entities.Alert.delete(alertId);
      loadAlerts();
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !alert.is_read;
    return alert.severity === filter;
  });

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-500',
      badge: 'bg-red-500'
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-500',
      badge: 'bg-amber-500'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-500',
      badge: 'bg-blue-500'
    }
  };

  const typeLabels = {
    deforestation: 'Deforestation',
    water_quality: 'Water Quality',
    fire: 'Fire',
    pollution: 'Pollution',
    system: 'System'
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const AlertCard = ({ alert }) => {
    const config = severityConfig[alert.severity] || severityConfig.info;
    const Icon = config.icon;

    return (
      <div
        onClick={() => {
          setSelectedAlert(alert);
          setDialogOpen(true);
          if (!alert.is_read) handleMarkAsRead(alert.id);
        }}
        className={cn(
          "p-4 rounded-xl border cursor-pointer transition-all duration-200",
          config.bg, config.border,
          "hover:shadow-lg hover:scale-[1.01]",
          !alert.is_read && "ring-2 ring-offset-2 ring-offset-background ring-primary/20"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-lg shrink-0", config.bg)}>
            <Icon className={cn("h-5 w-5", config.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{alert.title}</h3>
                  {!alert.is_read && (
                    <span className={cn("h-2 w-2 rounded-full animate-pulse", config.badge)} />
                  )}
                </div>
                <Badge variant="outline" className="mt-1 text-xs capitalize">
                  {typeLabels[alert.type] || alert.type}
                </Badge>
              </div>
              <Badge className={cn("text-white text-xs capitalize shrink-0", config.badge)}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {alert.message}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {alert.location?.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {alert.location.region}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {moment(alert.created_date).fromNow()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AlertDialog = () => {
    if (!selectedAlert) return null;
    const config = severityConfig[selectedAlert.severity] || severityConfig.info;
    const Icon = config.icon;

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bg)}>
                <Icon className={cn("h-5 w-5", config.text)} />
              </div>
              {selectedAlert.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={cn("text-white capitalize", config.badge)}>
                {selectedAlert.severity}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {typeLabels[selectedAlert.type] || selectedAlert.type}
              </Badge>
              {selectedAlert.is_read && (
                <Badge variant="outline" className="text-green-500 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Read
                </Badge>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Message</h4>
              <p className="text-muted-foreground">{selectedAlert.message}</p>
            </div>

            {selectedAlert.location && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Location</h4>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {selectedAlert.location.region || 
                     `${selectedAlert.location.lat?.toFixed(4)}, ${selectedAlert.location.lng?.toFixed(4)}`}
                  </span>
                </div>
              </div>
            )}

            {selectedAlert.data && Object.keys(selectedAlert.data).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Additional Data</h4>
                <div className="bg-secondary rounded-lg p-3 space-y-1">
                  {Object.entries(selectedAlert.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <span>{moment(selectedAlert.created_date).format('MMM D, YYYY h:mm A')}</span>
            </div>

            <div className="flex gap-2">
              {!selectedAlert.is_read && (
                <Button
                  variant="outline"
                  onClick={() => handleMarkAsRead(selectedAlert.id)}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedAlert.id)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Alerts</h1>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Real-time environmental alerts and notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-flex">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({alerts.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs sm:text-sm">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="critical" className="text-xs sm:text-sm">
                Critical
              </TabsTrigger>
              <TabsTrigger value="warning" className="text-xs sm:text-sm">
                Warning
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs sm:text-sm">
                Info
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-500">
              {alerts.filter(a => a.severity === 'critical').length}
            </p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-500">
              {alerts.filter(a => a.severity === 'warning').length}
            </p>
            <p className="text-xs text-muted-foreground">Warning</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <Info className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-500">
              {alerts.filter(a => a.severity === 'info').length}
            </p>
            <p className="text-xs text-muted-foreground">Info</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No alerts found</h3>
              <p className="text-muted-foreground">
                {filter !== 'all' 
                  ? 'Try changing your filter'
                  : 'All environmental systems are operating normally'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog />
    </div>
  );
}