import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, CheckCircle, UserPlus, FolderPlus, Edit } from "lucide-react";
import type { ActivityLog, User } from "@shared/schema";

export default function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/dashboard/activity'],
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created_contact':
        return UserPlus;
      case 'created_project':
        return FolderPlus;
      case 'created_task':
        return CheckCircle;
      case 'updated_contact':
      case 'updated_project':
      case 'updated_task':
        return Edit;
      default:
        return Mail;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'created_contact':
        return 'bg-purple-500';
      case 'created_project':
        return 'bg-emerald-500';
      case 'created_task':
        return 'bg-blue-500';
      case 'updated_contact':
      case 'updated_project':
      case 'updated_task':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActivityDescription = (activity: ActivityLog) => {
    const metadata = activity.metadata as any;
    const userName = user?.firstName + ' ' + user?.lastName || 'User';
    
    switch (activity.action) {
      case 'created_contact':
        return `${userName} created a new contact: ${metadata?.contactName || 'Unknown'}`;
      case 'created_project':
        return `${userName} created a new project: ${metadata?.projectName || 'Unknown'}`;
      case 'created_task':
        return `${userName} created a new task: ${metadata?.taskTitle || 'Unknown'}`;
      case 'updated_contact':
        return `${userName} updated contact: ${metadata?.contactName || 'Unknown'}`;
      case 'updated_project':
        return `${userName} updated project: ${metadata?.projectName || 'Unknown'}`;
      case 'updated_task':
        return `${userName} updated task: ${metadata?.taskTitle || 'Unknown'}`;
      default:
        return `${userName} performed an action`;
    }
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const activityDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - activityDate.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return activityDate.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
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
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity to display.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.action);
                const isLast = index === activities.length - 1;
                
                return (
                  <li key={activity.id}>
                    <div className={`relative ${!isLast ? 'pb-8' : ''}`}>
                      {!isLast && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className="relative">
                          <div className={`w-8 h-8 ${getActivityColor(activity.action)} rounded-full flex items-center justify-center`}>
                            <Icon className="text-white w-4 h-4" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div>
                            <div className="text-sm text-gray-900">
                              {getActivityDescription(activity)}
                            </div>
                            <p className="mt-0.5 text-sm text-gray-500">
                              {formatTimeAgo(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
