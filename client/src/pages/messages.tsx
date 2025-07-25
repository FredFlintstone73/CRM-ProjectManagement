import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ExternalLink, Calendar, User, FileText, CheckSquare, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import type { User as UserType, Task } from "@shared/schema";

interface MentionWithSource {
  id: number;
  mentionedUserId: string;
  mentionedByUserId: string;
  sourceType: string;
  sourceId: number;
  contextText: string;
  isRead: boolean;
  createdAt: string;
  mentionedBy: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  source?: {
    id: number;
    title?: string;
    content?: string;
    contactName?: string;
    projectName?: string;
    taskTitle?: string;
  };
}

interface TaskNotification extends Task {
  projectName?: string;
  daysUntilDue: number;
}

interface OverdueTask extends Task {
  projectName?: string;
  daysOverdue: number;
}

export default function Messages() {
  const { user } = useAuth() as { user: UserType | null };

  const { data: mentions = [], isLoading: mentionsLoading } = useQuery({
    queryKey: ['/api/mentions', user?.id],
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 300000 // 5 minutes
  });

  const { data: taskNotifications = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/notifications/tasks-due', user?.id],
    enabled: !!user?.id,
    staleTime: 60000, // 60 seconds
    gcTime: 300000 // 5 minutes
  });

  const { data: overdueTasks = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['/api/notifications/tasks-overdue', user?.id],
    enabled: !!user?.id,
    staleTime: 60000, // 60 seconds
    gcTime: 300000 // 5 minutes
  });

  const markAsRead = async (mentionId: number) => {
    try {
      await fetch(`/api/mentions/${mentionId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      // Refresh mentions
      window.location.reload();
    } catch (error) {
      console.error('Failed to mark mention as read:', error);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'task_comment':
        return <CheckSquare className="w-4 h-4" />;
      case 'contact_note':
        return <User className="w-4 h-4" />;
      case 'project_comment':
        return <FileText className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'task_comment':
        return 'Task Comment';
      case 'contact_note':
        return 'Contact Note';
      case 'project_comment':
        return 'Project Comment';
      default:
        return 'Message';
    }
  };

  const getNavigationLink = (mention: MentionWithSource) => {
    switch (mention.sourceType) {
      case 'task_comment':
        return `/task/${mention.source?.id}`;
      case 'contact_note':
        return `/contacts/${mention.source?.id}`;
      case 'project_comment':
        return `/projects/${mention.source?.id}`;
      default:
        return '#';
    }
  };

  const getContextTitle = (mention: MentionWithSource) => {
    switch (mention.sourceType) {
      case 'task_comment':
        return mention.source?.taskTitle || 'Task';
      case 'contact_note':
        return mention.source?.contactName || 'Contact';
      case 'project_comment':
        return mention.source?.projectName || 'Project';
      default:
        return 'Message';
    }
  };

  const getDueDateBadgeColor = (daysUntilDue: number) => {
    if (daysUntilDue <= 1) return "bg-red-100 text-red-800";
    if (daysUntilDue <= 3) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getDueDateText = (daysUntilDue: number) => {
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  };

  const getOverdueBadgeColor = (daysOverdue: number) => {
    return "bg-red-100 text-red-800";
  };

  const getOverdueText = (daysOverdue: number) => {
    if (daysOverdue === 1) return "1 day overdue";
    return `${daysOverdue} days overdue`;
  };

  if (mentionsLoading || tasksLoading || overdueLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unreadMentions = mentions.filter((m: MentionWithSource) => !m.isRead);
  const readMentions = mentions.filter((m: MentionWithSource) => m.isRead);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Messages & Notifications</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {unreadMentions.length} unread @mentions
          </Badge>
          <Badge variant="outline" className="text-sm">
            {taskNotifications.length} tasks due soon
          </Badge>
          <Badge variant="destructive" className="text-sm">
            {overdueTasks.length} overdue tasks
          </Badge>
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Overdue Tasks ({overdueTasks.length})
          </h2>
          
          <div className="grid gap-3">
            {overdueTasks.map((task: OverdueTask) => (
              <Card key={task.id} className="border-l-4 border-l-red-500">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium">
                          <Link 
                            href={`/task/${task.id}`}
                            className="hover:underline text-blue-600"
                          >
                            {task.title}
                          </Link>
                        </h3>
                      </div>
                      {task.projectName && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Project: {task.projectName}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getOverdueBadgeColor(task.daysOverdue)}>
                        {getOverdueText(task.daysOverdue)}
                      </Badge>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Task Due Date Notifications */}
      {taskNotifications.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Task Due Date Reminders ({taskNotifications.length})
          </h2>
          
          <div className="grid gap-3">
            {taskNotifications.map((task: TaskNotification) => (
              <Card key={task.id} className="border-l-4 border-l-orange-500">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium">
                          <Link 
                            href={`/task/${task.id}`}
                            className="hover:underline text-blue-600"
                          >
                            {task.title}
                          </Link>
                        </h3>
                      </div>
                      {task.projectName && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Project: {task.projectName}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getDueDateBadgeColor(task.daysUntilDue)}>
                        {getDueDateText(task.daysUntilDue)}
                      </Badge>
                      {task.daysUntilDue <= 1 && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {mentions.length === 0 && taskNotifications.length === 0 && overdueTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages or notifications yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This page shows @mentions from team members, overdue tasks, and task due date reminders.
              <br /><br />
              <strong>@Mentions:</strong> You can use @Pat, @PatSmith, or @PatS to mention team members.
              <br />
              <strong>Overdue Tasks:</strong> Tasks past their due date will appear here with red alerts.
              <br />
              <strong>Due Soon:</strong> Tasks due in the next couple of days and next week will appear here automatically.
              <br /><br />
              <strong>Tip:</strong> If multiple people share the same first name, use their full name (@FirstLast) or first name + last initial (@FirstL) to avoid ambiguous mentions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unread Mentions */}
          {unreadMentions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Unread @mentions ({unreadMentions.length})
              </h2>
              
              {unreadMentions.map((mention: MentionWithSource) => (
                <Card key={mention.id} className="border-l-4 border-l-blue-500 bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(mention.sourceType)}
                        <CardTitle className="text-base">
                          {mention.mentionedBy.firstName} {mention.mentionedBy.lastName}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {getSourceLabel(mention.sourceType)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(mention.createdAt), { addSuffix: true })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsRead(mention.id)}
                        >
                          Mark Read
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        in {getContextTitle(mention)}
                      </p>
                      <p className="text-sm bg-white p-3 rounded border">
                        {mention.contextText}
                      </p>
                      <Link href={getNavigationLink(mention)}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View in context
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Read Mentions */}
          {readMentions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                Recent @mentions ({readMentions.length})
              </h2>
              
              {readMentions.slice(0, 10).map((mention: MentionWithSource) => (
                <Card key={mention.id} className="border-gray-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(mention.sourceType)}
                        <CardTitle className="text-base text-muted-foreground">
                          {mention.mentionedBy.firstName} {mention.mentionedBy.lastName}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {getSourceLabel(mention.sourceType)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(mention.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        in {getContextTitle(mention)}
                      </p>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border">
                        {mention.contextText}
                      </p>
                      <Link href={getNavigationLink(mention)}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View in context
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}