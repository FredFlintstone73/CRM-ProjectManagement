import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ExternalLink, Calendar, User, FileText, CheckSquare, Clock, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

interface EmailWithContact {
  id: number;
  contactId: number;
  subject: string;
  sender: string;
  sentAt: string;
  emailType: string;
  isRead?: boolean;
  contact: {
    firstName: string;
    lastName: string;
    familyName: string;
  };
}

interface EmailNotification {
  id: number;
  emailInteractionId: number;
  isRead: boolean;
  email: EmailWithContact;
}

export default function Messages() {
  const { user } = useAuth() as { user: UserType | null };
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: mentions = [], isLoading: mentionsLoading } = useQuery({
    queryKey: ['/api/mentions', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes for faster navigation
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: taskNotifications = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/notifications/tasks-due', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes for faster navigation
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: overdueTasks = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['/api/notifications/tasks-overdue', user?.id],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes for faster navigation
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: emailNotifications = [], isLoading: emailsLoading } = useQuery<EmailNotification[]>({
    queryKey: ['/api/email-notifications'],
    enabled: !!user?.id,
    refetchInterval: false, // Disable polling for faster page load
    staleTime: 2 * 60 * 1000, // 2 minutes for faster navigation
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (mentionId: number) => {
      await apiRequest('PATCH', `/api/mentions/${mentionId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mentions', user?.id] });
      toast({
        title: "Mention marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to mark mention as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markEmailAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest('PATCH', `/api/email-notifications/${notificationId}/mark-read`),
    onMutate: async (notificationId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/email-notifications'] });
      
      // Snapshot the previous value
      const previousEmails = queryClient.getQueryData(['/api/email-notifications']);
      
      // Optimistically remove the email from the list
      queryClient.setQueryData(['/api/email-notifications'], (old: EmailNotification[] = []) =>
        old.filter(email => email.id !== notificationId)
      );
      
      return { previousEmails };
    },
    onError: (error: any, notificationId: number, context: any) => {
      // Rollback on error
      queryClient.setQueryData(['/api/email-notifications'], context?.previousEmails);
      toast({
        title: "Error",
        description: "Failed to mark email as read",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      requestIdleCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/email-notifications'] });
      });
    },
  });

  const markAllEmailsAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('PATCH', '/api/email-notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-notifications'] });
      toast({
        title: "Success",
        description: "All emails marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to mark all emails as read",
        variant: "destructive",
      });
    },
  });

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

  if (mentionsLoading || tasksLoading || overdueLoading || emailsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unreadMentions = mentions.filter((m: MentionWithSource) => !m.isRead);
  const readMentions = mentions.filter((m: MentionWithSource) => m.isRead);
  const unreadEmails = emailNotifications.filter(n => !n.isRead);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Messages & Notifications</h1>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {unreadEmails.length} unread emails
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {unreadMentions.length} unread @mentions
          </Badge>
          <Badge variant="outline" className="text-sm">
            {taskNotifications.length} tasks due soon
          </Badge>
          <Badge variant="destructive" className="text-sm">
            {overdueTasks.length} overdue tasks
          </Badge>
          {unreadEmails.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllEmailsAsReadMutation.mutate()}
              disabled={markAllEmailsAsReadMutation.isPending}
            >
              Mark All Emails Read
            </Button>
          )}
        </div>
      </div>

      {/* Unread Email Notifications */}
      {unreadEmails.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Unread Email Messages ({unreadEmails.length})
          </h2>
          
          <div className="grid gap-3">
            {unreadEmails.map((notification: EmailNotification) => (
              <Card key={notification.id} className="border-l-4 border-l-blue-500">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium">
                          <button
                            onClick={() => {
                              // Navigate immediately using client-side routing (much faster)
                              setLocation(`/contacts/${notification.email.contactId}?tab=interactions&email=${notification.emailInteractionId}`);
                              // Mark as read in background (non-blocking)
                              markEmailAsReadMutation.mutate(notification.id);
                            }}
                            onMouseEnter={() => {
                              // Prefetch email data on hover for instant loading
                              queryClient.prefetchQuery({
                                queryKey: ["/api/contacts", notification.email.contactId, "emails"],
                                staleTime: 60000,
                              });
                            }}
                            className="hover:underline text-blue-600 text-left"
                          >
                            {notification.email.subject}
                          </button>
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        From: {notification.email.sender}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Contact: {notification.email.contact.familyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Received: {formatDistanceToNow(new Date(notification.email.sentAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {notification.email.emailType === 'received' ? 'Received' : 'Sent'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markEmailAsReadMutation.mutate(notification.id)}
                        disabled={markEmailAsReadMutation.isPending}
                        className="text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Mark Read
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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

      {mentions.length === 0 && taskNotifications.length === 0 && overdueTasks.length === 0 && emailNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages or notifications yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              This page shows email notifications, @mentions from team members, overdue tasks, and task due date reminders.
              <br /><br />
              <strong>Email Notifications:</strong> Unread emails from contacts appear here automatically via IMAP monitoring.
              <br />
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
                          onClick={() => markAsReadMutation.mutate(mention.id)}
                          disabled={markAsReadMutation.isPending}
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