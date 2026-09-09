import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  TreeDeciduous,
  Droplets,
  AlertTriangle,
  Bird,
  HelpCircle,
  MapPin,
  Upload,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Camera,
  X,
  Phone,
  User,
  Brain,
  FileText
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import ReportCard from '@/components/ReportCard';
import WeeklySummaryPanel from '@/components/WeeklySummaryPanel';
import AIDistrictLogger from '@/components/AIDistrictLogger';
import MabiraLakeMonitor from '@/components/MabiraLakeMonitor';
import CopernicusSatellitePanel from '@/components/CopernicusSatellitePanel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Satellite } from 'lucide-react';
import moment from 'moment';

export default function Reports() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'deforestation',
    description: '',
    severity: 'medium',
    location: { lat: 0, lng: 0, address: '' },
    images: [],
    evidence_description: '',
    contact_phone: '',
    reporter_name: '',
    observation_date: '',
    location_description: '',
    witnesses: '',
    actions_taken: '',
    additional_comments: ''
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me().catch(() => null);
      setUser(userData);
      const isAdmin = userData?.role === 'admin';
      const userId = userData?.id;

      const [reportsData, zonesData] = await Promise.all([
        isAdmin
          ? base44.entities.Report.list('-created_date', 100)
          : base44.entities.Report.filter({ created_by_id: userId }, '-created_date', 100).catch(() => []),
        base44.entities.MonitoringZone.list('-created_date', 50).catch(() => []),
      ]);
      setReports(reportsData);
      setZones(zonesData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Try to get address from reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            
            setFormData(prev => ({
              ...prev,
              location: { lat, lng, address }
            }));
          } catch (e) {
            setFormData(prev => ({
              ...prev,
              location: {
                lat,
                lng,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
              }
            }));
          }
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (e) {
      console.error(e);
    }
    setUploadingPhotos(false);
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhotos(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, file_url]
      }));
    } catch (e) {
      console.error(e);
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.Report.create(formData);
      setCreateDialogOpen(false);
      setFormData({
        title: '',
        type: 'deforestation',
        description: '',
        severity: 'medium',
        location: { lat: 0, lng: 0, address: '' },
        images: [],
        evidence_description: '',
        contact_phone: '',
        reporter_name: '',
        observation_date: '',
        location_description: '',
        witnesses: '',
        actions_taken: '',
        additional_comments: ''
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await base44.entities.Report.update(reportId, { status: newStatus });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (reportId, verified) => {
    try {
      await base44.entities.Report.update(reportId, { verified });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const typeConfig = {
    deforestation: { icon: TreeDeciduous, label: 'Deforestation', color: 'text-green-500' },
    water_pollution: { icon: Droplets, label: 'Water Pollution', color: 'text-blue-500' },
    illegal_activity: { icon: AlertTriangle, label: 'Illegal Activity', color: 'text-red-500' },
    wildlife: { icon: Bird, label: 'Wildlife', color: 'text-amber-500' },
    other: { icon: HelpCircle, label: 'Other', color: 'text-gray-500' }
  };

  const ViewReportDialog = () => {
    if (!selectedReport) return null;
    const config = typeConfig[selectedReport.type] || typeConfig.other;
    const Icon = config.icon;

    return (
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Icon className={cn("h-6 w-6", config.color)} />
              {selectedReport.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={
                selectedReport.severity === 'critical' ? 'destructive' :
                selectedReport.severity === 'high' ? 'destructive' :
                'default'
              }>
                {selectedReport.severity} severity
              </Badge>
              <Badge variant="outline" className="capitalize">
                {selectedReport.status}
              </Badge>
              {selectedReport.verified && (
                <Badge variant="outline" className="text-green-500 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedReport.description}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Location</h4>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {selectedReport.location?.address || 
                   `${selectedReport.location?.lat?.toFixed(6)}, ${selectedReport.location?.lng?.toFixed(6)}`}
                </span>
              </div>
            </div>

            {selectedReport.images?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Images</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedReport.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="rounded-lg object-cover h-32 w-full" />
                  ))}
                </div>
              </div>
            )}

            {selectedReport.ai_analysis && (
              <div>
                <h4 className="text-sm font-semibold mb-2">AI Analysis</h4>
                <div className="bg-secondary rounded-lg p-4 text-sm">
                  {selectedReport.ai_analysis}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <span>Reported by: {selectedReport.created_by}</span>
              <span>{moment(selectedReport.created_date).format('MMM D, YYYY h:mm A')}</span>
            </div>

            {(user?.role === 'admin' || user?.role === 'organisation') && (
              <div className="flex gap-2 pt-4 border-t">
                <Select
                  value={selectedReport.status}
                  onValueChange={(value) => handleStatusChange(selectedReport.id, value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={selectedReport.verified ? "destructive" : "default"}
                  onClick={() => handleVerify(selectedReport.id, !selectedReport.verified)}
                >
                  {selectedReport.verified ? 'Unverify' : 'Verify'}
                </Button>
              </div>
            )}
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
          <p className="mt-4 text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Environmental Reports</h1>
          <p className="text-muted-foreground">Submit and track environmental issues</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Reporter Information */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Reporter Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.reporter_name || ''}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+256 700 000 000"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Incident Details
                </h3>
                <div>
                  <Label>Report Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief, clear title of the environmental issue"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(typeConfig).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity Level *</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor concern</SelectItem>
                        <SelectItem value="medium">Medium - Needs attention</SelectItem>
                        <SelectItem value="high">High - Urgent issue</SelectItem>
                        <SelectItem value="critical">Critical - Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Detailed Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a detailed description: What happened? When did you observe it? Who or what is affected?"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Include dates, times, and specific observations
                  </p>
                </div>
                <div>
                  <Label>Date & Time of Observation</Label>
                  <Input
                    type="datetime-local"
                    value={formData.observation_date || ''}
                    onChange={(e) => setFormData({ ...formData, observation_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Information
                </h3>
                <div>
                  <Label>GPS Location (Auto-detected) *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={formData.location.address}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { ...formData.location, address: e.target.value }
                      })}
                      placeholder="Click GPS button to detect location"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleGetLocation}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.location.lat !== 0 && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        ✓ GPS Coordinates: {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Nearest Landmark or Description</Label>
                  <Input
                    value={formData.location_description || ''}
                    onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                    placeholder="e.g., Near Mabira Forest entrance, 500m from main road"
                  />
                </div>
              </div>

              {/* Evidence */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Evidence Collection
                </h3>
                <div>
                  <Label>Photo Evidence *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload clear photos showing the issue. Multiple angles recommended.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingPhotos}
                      />
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Upload Photos</p>
                    </label>
                    <label className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                        disabled={uploadingPhotos}
                      />
                      <Camera className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Take Photo</p>
                    </label>
                  </div>
                  {uploadingPhotos && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading photos...
                    </div>
                  )}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {formData.images.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Evidence Description *</Label>
                  <Textarea
                    value={formData.evidence_description}
                    onChange={(e) => setFormData({ ...formData, evidence_description: e.target.value })}
                    placeholder="Describe what the photos show. Include specific observations like colors, odors, sounds, extent of damage, etc."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Witnesses (if any)</Label>
                  <Input
                    value={formData.witnesses || ''}
                    onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                    placeholder="Names and contacts of other witnesses"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Additional Information
                </h3>
                <div>
                  <Label>Immediate Actions Taken</Label>
                  <Textarea
                    value={formData.actions_taken || ''}
                    onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                    placeholder="Did you take any immediate action? Contact anyone? Prevent further damage?"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Additional Comments</Label>
                  <Textarea
                    value={formData.additional_comments || ''}
                    onChange={(e) => setFormData({ ...formData, additional_comments: e.target.value })}
                    placeholder="Any other information that might be helpful"
                    rows={2}
                  />
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.title || !formData.description || !formData.reporter_name || !formData.contact_phone || formData.images.length === 0}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  'Submit Environmental Report'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By submitting, you confirm that the information provided is accurate to the best of your knowledge.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly Summary Panel — admin only */}
      {user?.role === 'admin' && (
        <WeeklySummaryPanel reports={reports} zones={zones} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="reports">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" /> Field Reports
          </TabsTrigger>
          <TabsTrigger value="satellite" className="gap-2">
            <Satellite className="h-4 w-4" /> Satellite Monitor
          </TabsTrigger>
          <TabsTrigger value="copernicus" className="gap-2">
            <Satellite className="h-4 w-4" /> Copernicus Live
          </TabsTrigger>
          <TabsTrigger value="ai_logs" className="gap-2">
            <Brain className="h-4 w-4" /> AI District Logs
          </TabsTrigger>
        </TabsList>

        {/* ── FIELD REPORTS TABLE ── */}
        <TabsContent value="reports" className="space-y-4 mt-0">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports..."
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(typeConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No reports found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Be the first to report an environmental issue'}
                  </p>
                  {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
                    <Button onClick={() => setCreateDialogOpen(true)}>Create First Report</Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-semibold">Title</TableHead>
                        <TableHead className="text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Severity</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Location</TableHead>
                        <TableHead className="text-xs font-semibold">Reporter</TableHead>
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Verified</TableHead>
                        <TableHead className="text-xs font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => {
                        const tc = typeConfig[report.type] || typeConfig.other;
                        const TypeIcon = tc.icon;
                        const severityColor = {
                          low: 'bg-green-100 text-green-700',
                          medium: 'bg-yellow-100 text-yellow-700',
                          high: 'bg-orange-100 text-orange-700',
                          critical: 'bg-red-100 text-red-700',
                        }[report.severity] || 'bg-gray-100 text-gray-600';
                        const statusColor = {
                          pending: 'bg-blue-100 text-blue-700',
                          investigating: 'bg-purple-100 text-purple-700',
                          resolved: 'bg-green-100 text-green-700',
                          dismissed: 'bg-gray-100 text-gray-600',
                        }[report.status] || 'bg-gray-100 text-gray-600';
                        return (
                          <TableRow
                            key={report.id}
                            className="hover:bg-muted/20 cursor-pointer"
                            onClick={() => { setSelectedReport(report); setViewDialogOpen(true); }}
                          >
                            <TableCell className="font-medium text-sm max-w-[180px]">
                              <span className="truncate block">{report.title}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs">
                                <TypeIcon className={`h-3.5 w-3.5 ${tc.color}`} />
                                {tc.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${severityColor}`}>
                                {report.severity}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusColor}`}>
                                {report.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[140px]">
                              <span className="truncate block">
                                {report.location?.address || (report.location?.lat ? `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}` : '—')}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {report.created_by?.split('@')[0] || '—'}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {moment(report.created_date).format('MMM D, YYYY')}
                            </TableCell>
                            <TableCell>
                              {report.verified
                                ? <CheckCircle className="h-4 w-4 text-green-500" />
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                                <Eye className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SATELLITE MONITOR ── */}
        <TabsContent value="satellite" className="mt-0">
          <MabiraLakeMonitor />
        </TabsContent>

        {/* ── COPERNICUS LIVE SATELLITE ── */}
        <TabsContent value="copernicus" className="mt-0">
          <CopernicusSatellitePanel />
        </TabsContent>

        {/* ── AI DISTRICT LOGS ── */}
        <TabsContent value="ai_logs" className="mt-0">
          <AIDistrictLogger />
        </TabsContent>
      </Tabs>

      <ViewReportDialog />
    </div>
  );
}