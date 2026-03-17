import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-[70] w-[280px] bg-background border-r border-border lg:hidden animate-in slide-in-from-left duration-200">
            <div className="flex justify-end p-3">
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>
              {children}
            </div>
          </div>
        </>
      )}
    </>
  );
}
