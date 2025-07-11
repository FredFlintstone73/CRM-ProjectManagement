import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FolderOpen, UserCheck, AlertTriangle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { addDays, addWeeks, addMonths, startOfDay, endOfDay } from "date-fns";
import type { Project } from "@shared/schema";

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  prospects: number;
  overdueTasks: number;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

const getDateRanges = (): Record<string, DateRange> => {
  const now = new Date();
  const today = startOfDay(now);

  return {
    "next-1-week": {
      start: today,
      end: endOfDay(addWeeks(today, 1)),
      label: "Next 1 Week",
    },
    "next-2-weeks": {
      start: today,
      end: endOfDay(addWeeks(today, 2)),
      label: "Next 2 Weeks",
    },
    "next-1-month": {
      start: today,
      end: endOfDay(addMonths(today, 1)),
      label: "Next 1 Month",
    },
    "next-4-months": {
      start: today,
      end: endOfDay(addMonths(today, 4)),
      label: "Next 4 Months",
    },
    "next-12-months": {
      start: today,
      end: endOfDay(addMonths(today, 12)),
      label: "Next 12 Months",
    },
  };
};

export default function StatsCards() {
  const [selectedPeriod, setSelectedPeriod] = useState("next-4-months");
  const dateRanges = getDateRanges();
  const currentRange = dateRanges[selectedPeriod];

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: futureProjects } = useQuery<Project[]>({
    queryKey: ['/api/dashboard/projects-due', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: currentRange.start.toISOString(),
        endDate: currentRange.end.toISOString(),
      });
      const response = await fetch(`/api/dashboard/projects-due?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch future projects');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "bg-blue-500",
      change: "+12%",
      changeType: "positive",
    },
    {
      title: `Active Projects (${currentRange.label})`,
      value: futureProjects?.length || 0,
      icon: FolderOpen,
      color: "bg-emerald-500",
      change: "+8%",
      changeType: "positive",
    },
    {
      title: "Prospects",
      value: stats?.prospects || 0,
      icon: UserCheck,
      color: "bg-amber-500",
      change: "+23%",
      changeType: "positive",
    },
    {
      title: "Overdue Tasks",
      value: stats?.overdueTasks || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      change: "-15%",
      changeType: "negative",
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Dashboard Overview</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dateRanges).map(([key, range]) => (
                <SelectItem key={key} value={key}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const ChangeIcon = card.changeType === 'positive' ? TrendingUp : TrendingDown;
          return (
            <Card key={card.title} className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`flex-shrink-0 w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="metric-card-header">{card.title}</p>
                  <p className="metric-card-value">{card.value.toLocaleString()}</p>
                  <div className={`metric-card-change ${
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <ChangeIcon size={16} />
                    <span>{card.change}</span>
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
