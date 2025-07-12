import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import type { Project, Contact } from "@shared/schema";

export default function ProjectStatus() {
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const activeProjects = projects?.filter(p => p.status === 'active').slice(0, 3) || [];

  const getFamilyName = (clientId: number | null) => {
    if (!clientId || !contacts) return 'No family assigned';
    const client = contacts.find(c => c.id === clientId);
    return client ? (client.familyName || `${client.firstName} ${client.lastName}`) : 'Unknown family';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (projectsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Project Status</CardTitle>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <CardTitle className="text-lg">Project Status</CardTitle>
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activeProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No active projects. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{project.name}</p>
                  <span className="text-xs text-gray-500">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-2" />
                <p className="text-xs text-gray-500">
                  Family: {getFamilyName(project.clientId)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
