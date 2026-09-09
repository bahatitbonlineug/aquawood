import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Brain, Satellite, Map, Droplets, GraduationCap, Users, Leaf
} from 'lucide-react';

const CONTRIBUTIONS = [
  {
    icon: Brain,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    title: 'AI-Powered Early Warning',
    desc: 'Environmental monitoring and early-warning systems for forests, wetlands, watersheds, and protected ecosystems.',
    link: 'SatelliteMonitoring',
  },
  {
    icon: Satellite,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    title: 'Satellite Intelligence',
    desc: 'Satellite-based monitoring, reporting, and environmental intelligence products to strengthen planning and decision-making.',
    link: 'SatelliteMonitoring',
  },
  {
    icon: Map,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    title: 'GIS & Spatial Analysis',
    desc: 'GIS mapping, spatial analysis, and environmental data visualisation services across Uganda\'s ecosystems.',
    link: 'Map',
  },
  {
    icon: Droplets,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    title: 'Groundwater & Water Resources',
    desc: 'Groundwater assessment and geophysical survey services for sustainable water resource development and management.',
    link: 'Map',
  },
  {
    icon: GraduationCap,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    title: 'Technical Capacity Building',
    desc: 'Training Ministry staff and partners in GIS, Earth Observation, AI applications, environmental monitoring, and data management.',
    link: 'Organizations',
  },
  {
    icon: Users,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    title: 'Community Engagement',
    desc: 'Environmental awareness initiatives promoting conservation, restoration, and climate resilience at the community level.',
    link: 'Reports',
  },
  {
    icon: Leaf,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    title: 'Environmental Governance',
    desc: 'Technology-driven solutions complementing Ministry efforts in ecosystem restoration and sustainable natural resource management.',
    link: 'ActionPlans',
  },
];

export default function AquawoodMission() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-tight">AQUAWOOD Contributions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Our commitment to Uganda's environmental future — seven pillars of impact
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CONTRIBUTIONS.map((item) => (
          <Link key={item.title} to={createPageUrl(item.link)} className="group block">
            <div className="h-full rounded-xl border border-border bg-secondary/30 p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-secondary/60">
              <div className={`inline-flex items-center justify-center rounded-lg p-2.5 mb-3 ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}