import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FolderOpen, UserCheck, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  prospects: number;
  overdueTasks: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
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
      title: "Active Projects",
      value: stats?.activeProjects || 0,
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
  );
}
