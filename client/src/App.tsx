import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Templates from "@/pages/templates";
import TemplateDetail from "@/pages/template-detail";
import TaskDetail from "@/pages/task-detail";
import TaskDetailSimple from "@/pages/task-detail-simple";
import Tasks from "@/pages/tasks";
import Sidebar from "@/components/layout/sidebar";
import { FloatingActionButton } from "@/components/ui/floating-action-button";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="bg-gray-50">
            <Sidebar />
            <div className="ml-64 flex flex-col">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/contacts" component={Contacts} />
                <Route path="/contacts/:id" component={ContactDetail} />
                <Route path="/projects" component={Projects} />
                <Route path="/projects/:id" component={ProjectDetail} />
                <Route path="/templates" component={Templates} />
                <Route path="/templates/:id" component={TemplateDetail} />
                <Route path="/templates/:templateId/tasks/:taskId" component={TaskDetail} />
                <Route path="/task/:id" component={TaskDetailSimple} />
                <Route path="/tasks" component={Tasks} />
                <Route component={NotFound} />
              </Switch>
            </div>
            <FloatingActionButton />
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
