import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/store';
import { SPORTS } from '@/sports';
import type { SportId } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function RecoveryEntry({ sport }: { sport?: SportId }) {
  const store = useStore();
  const label = sport ? SPORTS[sport].name : 'All sports';
  const copy = sport ? store.recoveryCopy(sport) : store.unreadable!;
  return (
    <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-sm" data-testid={`status-recovery-${sport ?? 'all'}`}>
      <p className="font-semibold">{label}: saved data could not be loaded</p>
      <p>The saved data is damaged or uses an unsupported version. It has been kept in this browser, not erased.
        {sport ? ' Other undamaged sports can still be used and saved.' : ' Saving is paused until you choose how to recover.'}
        {' '}Download a copy before resetting; the copy is for recovery, not an automatic repair.</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <a className="underline" href={`data:application/json;charset=utf-8,${encodeURIComponent(copy)}`}
          download={`coachiq-recovery-${sport ?? 'all'}.json`} data-testid={`link-recovery-copy-${sport ?? 'all'}`}>
          Download {sport ? SPORTS[sport].name : 'saved data'} recovery copy
        </a>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" data-testid={`button-recover-${sport ?? 'all'}`}>Reset {label} saved data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset {label} saved data?</AlertDialogTitle>
              <AlertDialogDescription>
                This replaces {sport ? `only ${SPORTS[sport].name}'s` : 'all'} saved work with fresh fictional demo data.
                Download a recovery copy first if you want to keep the damaged work. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-recovery">Cancel</AlertDialogCancel>
              <AlertDialogAction data-testid="button-confirm-recovery" onClick={() => sport ? store.reset(sport) : store.recoverAll()}>
                Replace with demo data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/** Kept outside route content so failures remain visible across sports and pages. */
export function StorageNotice() {
  const { storageStatus, retrySave, damaged, unreadable, readFailed } = useStore();
  return (
    <>
      {(damaged.length > 0 || unreadable !== null || readFailed) && (
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-3 sm:px-6" data-testid="status-storage-recovery">
          {readFailed ? (
            <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-sm">
              <p className="font-semibold">Browser saved data could not be read</p>
              <p>Saving is paused to avoid overwriting work we could not read. Allow browser storage, then reload to try again. Nothing has been erased.</p>
              <Button variant="outline" className="mt-3" onClick={() => window.location.reload()} data-testid="button-retry-reading">Reload saved data</Button>
            </div>
          ) : unreadable !== null ? <RecoveryEntry /> : damaged.map((sport) => <RecoveryEntry key={sport} sport={sport} />)}
        </div>
      )}
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
    </>
  );
}
