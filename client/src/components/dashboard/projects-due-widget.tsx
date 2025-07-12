
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, FolderOpen, User } from "lucide-react";
import { format, addDays, addWeeks, addMonths, startOfDay, endOfDay } from "date-fns";
import type { Project, Contact } from "@shared/schema";

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface ProjectsDueWidgetProps {
  selectedPeriod: string;
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

export default function ProjectsDueWidget({ selectedPeriod }: ProjectsDueWidgetProps) {
  const dateRanges = getDateRanges();
  const currentRange = dateRanges[selectedPeriod];

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/dashboard/projects-due', selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: currentRange.start.toISOString(),
        endDate: currentRange.end.toISOString(),
      });
      const response = await fetch(`/api/dashboard/projects-due?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects due soon');
      }
      return response.json();
    },
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId || !contacts) return 'No client assigned';
    const client = contacts.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown client';
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <CardTitle>Status - Upcoming Progress Meetings ({currentRange.label})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Unable to load projects due soon</p>
          </div>
        )}

        {!isLoading && !error && projects && (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                <strong>{projects.length}</strong> projects due in the {currentRange.label.toLowerCase()}
              </p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No projects due in the {currentRange.label.toLowerCase()}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {projects.map((project) => {
                  const daysUntilDue = project.dueDate ? getDaysUntilDue(project.dueDate) : null;
                  
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p className="font-medium text-[16px]">{project.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {project.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span className="text-[14px]">Meeting {format(new Date(project.dueDate), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span className="text-[14px]">{getClientName(project.clientId)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {daysUntilDue !== null && (
                        <div className="text-right">
                          <div className="font-medium text-orange-600 text-[14px]">
                            {daysUntilDue === 0 ? 'Meeting today' :
                             daysUntilDue === 1 ? 'Meeting tomorrow' :
                             daysUntilDue > 0 ? `${daysUntilDue} days left` :
                             `${Math.abs(daysUntilDue)} days overdue`}
                          </div>
                          <div className="space-y-1 mt-2 w-72">
                            <div className="flex justify-between text-xs">
                              <span className="text-[14px]">Progress</span>
                              <span className="text-[14px]">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress || 0} className="h-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}