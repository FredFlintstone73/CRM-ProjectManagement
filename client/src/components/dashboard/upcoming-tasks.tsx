import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Task, Project } from "@shared/schema";

export default function UpcomingTasks() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks', '?upcoming=true'],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const upcomingTasks = tasks?.slice(0, 5) || [];

  const getProjectName = (projectId: number | null) => {
    if (!projectId || !projects) return 'No project assigned';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown project';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 40) return 'bg-red-500'; // High priority (40-50)
    if (priority >= 30) return 'bg-orange-500'; // Medium-high priority (30-39)
    if (priority >= 20) return 'bg-amber-500'; // Medium priority (20-29)
    if (priority >= 10) return 'bg-yellow-500'; // Low-medium priority (10-19)
    return 'bg-green-500'; // Low priority (1-9)
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';
    
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays < 7) return `Due in ${diffDays} days`;
    
    return `Due: ${date.toLocaleDateString()}`;
  };

  if (tasksLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No upcoming tasks. Create your first task to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-2 h-2 ${getPriorityColor(task.priority || 'medium')} rounded-full mt-2`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500">{getProjectName(task.projectId)}</p>
                  <p className="text-xs text-gray-500">{formatDueDate(task.dueDate)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
