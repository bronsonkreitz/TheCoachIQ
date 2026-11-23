import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/store';

/** Kept outside route content so failures remain visible across sports and pages. */
export function StorageNotice() {
  const { storageStatus, retrySave } = useStore();
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {storageStatus === 'error' && (
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-1 gap-3 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold">Changes are not saved to this browser</p>
              <p>You can keep editing in this tab, but recent changes will be lost if you reload or close it. Browser storage may be full or blocked. Free up space or allow browser storage, then retry.</p>
            </div>
          </div>
          <Button variant="outline" onClick={retrySave}>Retry saving</Button>
        </div>
      )}
    </div>
  );
}
