
interface InventorySectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function InventorySection({ title, icon, count, action, children }: InventorySectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</span>
          <span className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2 py-0.2 leading-none">
            {count}
          </span>
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

