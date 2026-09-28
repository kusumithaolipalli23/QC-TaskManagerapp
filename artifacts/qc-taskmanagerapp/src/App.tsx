import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/app-shell';
import Dashboard from '@/pages/dashboard';
import Tasks from '@/pages/tasks';
import TaskDetail from '@/pages/task-detail';
import Status from '@/pages/status';
import { TaskForm } from '@/components/task-form';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { getGetTaskQueryKey, useGetTask } from '@workspace/api-client-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, refetchOnWindowFocus: true } } });

function EditTask() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const task = useGetTask(id, { query: { queryKey: getGetTaskQueryKey(id) } });
  if (task.isLoading) return <div className="mx-auto max-w-3xl"><div className="h-8 w-56 animate-pulse rounded bg-muted" /><div className="mt-8 h-72 animate-pulse rounded-xl bg-muted" /></div>;
  if (task.isError || !task.data) return <div className="p-10 text-center text-sm font-bold text-destructive">Unable to load this task.</div>;
  return <TaskForm task={task.data} />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/tasks/new"><TaskForm /></Route>
          <Route path="/tasks/:id/edit" component={EditTask} />
          <Route path="/tasks/:id" component={TaskDetail} />
          <Route path="/status" component={Status} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;