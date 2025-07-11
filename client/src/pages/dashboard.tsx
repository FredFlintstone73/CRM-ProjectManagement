import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import RecentContacts from "@/components/dashboard/recent-contacts";
import UpcomingTasks from "@/components/dashboard/upcoming-tasks";
import ProjectStatus from "@/components/dashboard/project-status";
import ActivityFeed from "@/components/dashboard/activity-feed";
import ProjectsDueWidget from "@/components/dashboard/projects-due-widget";
import ProjectsTimelineChart from "@/components/dashboard/projects-timeline-chart";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("next-4-months");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening today."
        showActions={true}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          <StatsCards selectedPeriod={selectedPeriod} />
          
          <div className="grid grid-cols-1 gap-6 mt-8">
            <ProjectsTimelineChart 
              selectedPeriod={selectedPeriod} 
              onPeriodChange={setSelectedPeriod} 
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <ProjectsDueWidget />
            </div>
            
            <div className="space-y-6">
              <UpcomingTasks />
              <ProjectStatus />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <RecentContacts />
            <ActivityFeed />
          </div>
        </div>
      </main>
    </>
  );
}
