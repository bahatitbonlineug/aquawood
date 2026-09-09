import {
  Users, Building2, FileText, Bell, Satellite, TreeDeciduous,
  BarChart3, Brain, Cloud, Database, Settings, Mail, Activity, MapPin,
} from 'lucide-react';

export const ENTITY_REGISTRY = [
  { name: 'User', label: 'Users', icon: Users, canImport: false, description: 'System users (export only — auth managed by platform)' },
  { name: 'Organisation', label: 'Organizations', icon: Building2, canImport: true, description: 'Registered organizations' },
  { name: 'Report', label: 'Reports', icon: FileText, canImport: true, description: 'Environmental reports' },
  { name: 'Alert', label: 'Alerts', icon: Bell, canImport: true, description: 'System alerts' },
  { name: 'MonitoringActivity', label: 'Monitoring Activities', icon: Activity, canImport: true, description: 'Field monitoring records' },
  { name: 'MonitoringZone', label: 'Monitoring Zones', icon: TreeDeciduous, canImport: true, description: 'Defined monitoring zones' },
  { name: 'EnvironmentalData', label: 'Environmental Data', icon: BarChart3, canImport: true, description: 'Environmental measurements' },
  { name: 'PlantDiagnosis', label: 'Plant Diagnoses', icon: Brain, canImport: true, description: 'AI plant disease diagnoses' },
  { name: 'ActionPlan', label: 'Action Plans', icon: FileText, canImport: true, description: 'AI-generated action plans' },
  { name: 'SatelliteScene', label: 'Satellite Scenes', icon: Satellite, canImport: true, description: 'Sentinel-2 satellite imagery' },
  { name: 'SatelliteMonitoringLog', label: 'Satellite Logs', icon: Satellite, canImport: true, description: 'Hourly satellite monitoring logs' },
  { name: 'DailyMonitoringReport', label: 'Daily Reports', icon: FileText, canImport: true, description: 'Daily monitoring summaries' },
  { name: 'WeatherData', label: 'Weather Data', icon: Cloud, canImport: true, description: 'Weather records by district' },
  { name: 'AIDistrictLog', label: 'AI District Logs', icon: MapPin, canImport: true, description: 'AI analysis logs per district' },
  { name: 'UgandaEnvArchive', label: 'Uganda Archive', icon: Database, canImport: true, description: 'Historical environmental archive' },
  { name: 'AppSettings', label: 'App Settings', icon: Settings, canImport: true, description: 'Application configuration' },
  { name: 'WeeklySummaryConfig', label: 'Weekly Summary Config', icon: Mail, canImport: true, description: 'Weekly email summary settings' },
];