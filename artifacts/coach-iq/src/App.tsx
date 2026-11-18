import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/Landing';
import Sports from '@/pages/Sports';
import About from '@/pages/About';
import { StoreProvider } from '@/store/store';
import { SiteLayout } from '@/components/layout/Site';
import { SportShell } from '@/components/coach/SportShell';
import Overview from '@/pages/sport/Overview';
import Roster from '@/pages/sport/Roster';
import PlayerProfile from '@/pages/sport/PlayerProfile';
import Stats from '@/pages/sport/Stats';
import Lineup from '@/pages/sport/Lineup';
import Practice from '@/pages/sport/Practice';
import Games from '@/pages/sport/Games';
import Tools from '@/pages/sport/Tools';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/sports" component={Sports} />
        <Route path="/about" component={About} />
        <Route path="/:sport/roster/:playerId">{(p) => <SportShell sport={p.sport}><PlayerProfile playerId={p.playerId} /></SportShell>}</Route>
        <Route path="/:sport/roster">{(p) => <SportShell sport={p.sport}><Roster /></SportShell>}</Route>
        <Route path="/:sport/stats">{(p) => <SportShell sport={p.sport}><Stats /></SportShell>}</Route>
        <Route path="/:sport/lineup">{(p) => <SportShell sport={p.sport}><Lineup /></SportShell>}</Route>
        <Route path="/:sport/practice">{(p) => <SportShell sport={p.sport}><Practice /></SportShell>}</Route>
        <Route path="/:sport/games">{(p) => <SportShell sport={p.sport}><Games /></SportShell>}</Route>
        <Route path="/:sport/tools">{(p) => <SportShell sport={p.sport}><Tools /></SportShell>}</Route>
        <Route path="/:sport">{(p) => <SportShell sport={p.sport}><Overview /></SportShell>}</Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <SiteLayout>
              <Router />
            </SiteLayout>
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
