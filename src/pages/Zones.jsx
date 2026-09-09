import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TreeDeciduous,
  Droplets,
  Mountain,
  Building,
  Plus,
  Search,
  MapPin,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import MapComponent from '@/components/MapComponent';
import moment from 'moment';

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'forest',
    status: 'healthy',
    center: { lat: 0, lng: 0 },
    organisation_id: '',
    metrics: {
      forest_cover: 0,
      water_quality_index: 0,
      deforestation_rate: 0,
      pollution_level: 0
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [zonesData, orgsData] = await Promise.all([
        base44.entities.MonitoringZone.list('-created_date', 100),
        base44.entities.Organisation.list()
      ]);
      setZones(zonesData);
      setOrganizations(orgsData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editingZone) {
        await base44.entities.MonitoringZone.update(editingZone.id, formData);
      } else {
        await base44.entities.MonitoringZone.create(formData);
      }
      setDialogOpen(false);
      setEditingZone(null);
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name || '',
      type: zone.type || 'forest',
      status: zone.status || 'healthy',
      center: zone.center || { lat: 0, lng: 0 },
      organisation_id: zone.organisation_id || '',
      metrics: zone.metrics || {
        forest_cover: 0,
        water_quality_index: 0,
        deforestation_rate: 0,
        pollution_level: 0
      }
    });
    setDialogOpen(true);
  };

  const handleDelete = async (zoneId) => {
    if (confirm('Are you sure you want to delete this zone?')) {
      try {
        await base44.entities.MonitoringZone.delete(zoneId);
        loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            center: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        }
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'forest',
      status: 'healthy',
      center: { lat: 0, lng: 0 },
      organisation_id: '',
      metrics: {
        forest_cover: 0,
        water_quality_index: 0,
        deforestation_rate: 0,
        pollution_level: 0
      }
    });
  };

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || zone.type === filterType;
    const matchesStatus = filterStatus === 'all' || zone.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const typeConfig = {
    forest: { label: 'Forest', icon: TreeDeciduous, color: 'text-green-500 bg-green-500/10' },
    water_body: { label: 'Water Body', icon: Droplets, color: 'text-blue-500 bg-blue-500/10' },
    wetland: { label: 'Wetland', icon: Droplets, color: 'text-teal-500 bg-teal-500/10' },
    urban: { label: 'Urban', icon: Building, color: 'text-gray-500 bg-gray-500/10' },
    agricultural: { label: 'Agricultural', icon: Mountain, color: 'text-amber-500 bg-amber-500/10' }
  };

  const statusConfig = {
    healthy: { label: 'Healthy', color: 'bg-green-500' },
    at_risk: { label: 'At Risk', color: 'bg-amber-500' },
    critical: { label: 'Critical', color: 'bg-red-500' }
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Unassigned';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading zones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Zones</h1>
          <p className="text-muted-foreground">Manage environmental monitoring areas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingZone(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Edit Zone' : 'Add Monitoring Zone'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Zone Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter zone name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
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
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Center Location</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={formData.center.lat}
                    onChange={(e) => setFormData({
                      ...formData,
                      center: { ...formData.center, lat: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Latitude"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={formData.center.lng}
                    onChange={(e) => setFormData({
                      ...formData,
                      center: { ...formData.center, lng: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Longitude"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleGetLocation}>
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Assigned Organization</Label>
                <Select
                  value={formData.organisation_id || 'none'}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    organisation_id: value === 'none' ? '' : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold">Metrics</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Forest Cover (%)</Label>
                    <Input
                      type="number"
                      value={formData.metrics.forest_cover}
                      onChange={(e) => setFormData({
                        ...formData,
                        metrics: { ...formData.metrics, forest_cover: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Water Quality (0-100)</Label>
                    <Input
                      type="number"
                      value={formData.metrics.water_quality_index}
                      onChange={(e) => setFormData({
                        ...formData,
                        metrics: { ...formData.metrics, water_quality_index: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Deforestation Rate (%/yr)</Label>
                    <Input
                      type="number"
                      value={formData.metrics.deforestation_rate}
                      onChange={(e) => setFormData({
                        ...formData,
                        metrics: { ...formData.metrics, deforestation_rate: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pollution Level</Label>
                    <Input
                      type="number"
                      value={formData.metrics.pollution_level}
                      onChange={(e) => setFormData({
                        ...formData,
                        metrics: { ...formData.metrics, pollution_level: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.name}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingZone ? 'Update Zone' : 'Create Zone'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = zones.filter(z => z.status === status).length;
          return (
            <Card key={status} className={`border-l-4`} style={{ borderLeftColor: config.color.replace('bg-', '#').replace('-500', '') }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                  <div className={cn("p-2 rounded-lg", config.color)}>
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search zones..."
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
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Map Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Zone Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <MapComponent
            zones={filteredZones}
            onZoneClick={(zone) => setSelectedZone(zone)}
            className="h-[300px]"
          />
        </CardContent>
      </Card>

      {/* Zones Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredZones.length > 0 ? (
          filteredZones.map((zone) => {
            const config = typeConfig[zone.type] || typeConfig.forest;
            const status = statusConfig[zone.status] || statusConfig.healthy;
            const Icon = config.icon;
            return (
              <Card key={zone.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-xl", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{zone.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {zone.type?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(zone)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(zone.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {zone.metrics?.forest_cover !== undefined && (
                      <div className="bg-secondary rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Forest</p>
                        <p className="font-semibold">{zone.metrics.forest_cover}%</p>
                      </div>
                    )}
                    {zone.metrics?.water_quality_index !== undefined && (
                      <div className="bg-secondary rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Water</p>
                        <p className="font-semibold">{zone.metrics.water_quality_index}/100</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge className={cn("text-white", status.color)}>
                      {status.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getOrgName(zone.organisation_id)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {zone.center?.lat?.toFixed(4)}, {zone.center?.lng?.toFixed(4)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-12 text-center">
                <TreeDeciduous className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No zones found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first monitoring zone'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}