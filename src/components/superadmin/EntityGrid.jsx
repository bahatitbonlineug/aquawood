import { ENTITY_REGISTRY } from '@/lib/entityRegistry';
import { cn } from '@/lib/utils';

export default function EntityGrid({ counts, loading, selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ENTITY_REGISTRY.map(entity => {
        const Icon = entity.icon;
        const count = counts[entity.name];
        const isSelected = selected?.name === entity.name;
        return (
          <button
            key={entity.name}
            onClick={() => onSelect(entity)}
            className={cn(
              'card-modern p-4 text-left transition-all',
              isSelected && 'ring-2 ring-primary'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{entity.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {loading ? '...' : `${count ?? 0} records`}
                </p>
              </div>
              {!entity.canImport && (
                <span className="text-[9px] text-amber-500 font-medium uppercase tracking-wide">
                  Export
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}