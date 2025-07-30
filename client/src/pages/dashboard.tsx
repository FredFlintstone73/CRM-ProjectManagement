import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import EmailNotificationIcon from "@/components/layout/email-notification-icon";

import Header from "@/components/layout/header";

import ProjectsDueWidget from "@/components/dashboard/projects-due-widget";
import ProjectsTimelineChart from "@/components/dashboard/projects-timeline-chart";
import ActionCard from "@/components/dashboard/action-card";

export default function Dashboard() {
  const { isAuthenticated, isLoading, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("next-4-months");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 1000); // Show refresh animation for 1 second
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back! Here's what's happening today.</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <EmailNotificationIcon />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hover:bg-gray-100"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="px-6 py-6 pl-[10px] pr-[10px] pt-[8px] pb-[8px]">
          <div className="grid grid-cols-1 gap-6">
            <ProjectsTimelineChart 
              selectedPeriod={selectedPeriod} 
              onPeriodChange={setSelectedPeriod}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onCustomDateChange={handleCustomDateChange}
            />
          </div>
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <ProjectsDueWidget 
                selectedPeriod={selectedPeriod} 
                customStartDate={customStartDate}
                customEndDate={customEndDate}
              />
            </div>
            <div className="lg:col-span-1">
              <ActionCard />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
