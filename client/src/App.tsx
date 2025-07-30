import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
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
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Messages from "@/pages/messages";
import Calendar from "@/pages/calendar";
import ConsolidatedMessages from "@/pages/consolidated-messages";
import DialpadSettings from "@/pages/dialpad-settings";

import Sidebar from "@/components/layout/sidebar";
// import { SessionTimeoutManager } from "@/components/auth/SessionTimeoutManager";


function Router() {
  const { user, isLoading } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // Load saved width from localStorage, default to 320px for better logout button visibility
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 320;
  });

  // Save sidebar width to localStorage when it changes
  const handleSidebarWidthChange = (width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('sidebarWidth', width.toString());
  };

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
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      {!user ? (
        <Route path="/" component={AuthPage} />
      ) : (
        <div className="bg-gray-50 flex h-screen">
          <Sidebar width={sidebarWidth} onWidthChange={handleSidebarWidthChange} />
          <div 
            className="flex flex-col flex-1 min-w-0 overflow-auto"
            style={{ marginLeft: 0 }}
          >
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/accept-invitation" component={AcceptInvitation} />
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
              <Route path="/dialpad" component={DialpadSettings} />
              <Route path="/user-management" component={UserManagement} />
              <Route path="/administration" component={Administration} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
