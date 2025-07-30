import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

import Header from "@/components/layout/header";

import ProjectsDueWidget from "@/components/dashboard/projects-due-widget";
import ProjectsTimelineChart from "@/components/dashboard/projects-timeline-chart";
import ActionCard from "@/components/dashboard/action-card";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("next-4-months");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
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
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening today."
      />
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
