import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

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
import UserManagement from "@/pages/user-management";
import Administration from "@/pages/administration";
import Marketing from "@/pages/marketing";
import Settings from "@/pages/settings";
import AcceptInvitation from "@/pages/accept-invitation";
import Messages from "@/pages/messages";
import Calendar from "@/pages/calendar";
import ConsolidatedMessages from "@/pages/consolidated-messages";
import Sidebar from "@/components/layout/sidebar";
import { Mandatory2FAWrapper } from "@/components/auth/Mandatory2FAWrapper";
import { SessionTimeoutManager } from "@/components/auth/SessionTimeoutManager";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem = 256px

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/accept-invitation" component={AcceptInvitation} />
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Mandatory2FAWrapper>
          <div className="bg-gray-50 flex h-screen">
            <Sidebar width={sidebarWidth} onWidthChange={setSidebarWidth} />
            <div 
              className="flex flex-col flex-1 min-w-0 overflow-auto"
              style={{ marginLeft: 0 }}
            >
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/contacts" component={Contacts} />
                <Route path="/contacts/:id" component={ContactDetail} />
                <Route path="/projects" component={Projects} />
                <Route path="/projects/:id" component={ProjectDetail} />
                <Route path="/templates" component={Templates} />
                <Route path="/templates/:id" component={TemplateDetail} />
                <Route path="/templates/:templateId/tasks/:taskId" component={TaskDetail} />
                <Route path="/task/:id" component={TaskDetail} />
                <Route path="/tasks" component={Tasks} />
                <Route path="/marketing" component={Marketing} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/messages" component={Messages} />
                <Route path="/consolidated-messages" component={ConsolidatedMessages} />
                <Route path="/settings" component={Settings} />
                <Route path="/user-management" component={UserManagement} />
                <Route path="/administration" component={Administration} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </div>
        </Mandatory2FAWrapper>
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
        <SessionTimeoutManager />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
