import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ExternalLink, Calendar, User, FileText, CheckSquare } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { User as UserType } from "@shared/schema";

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

export default function Messages() {
  const { user } = useAuth() as { user: UserType | null };

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['/api/mentions', user?.id],
    enabled: !!user?.id,
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

  if (isLoading) {
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
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <Badge variant="secondary" className="text-sm">
          {unreadMentions.length} unread @mentions
        </Badge>
      </div>

      {mentions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No @mentions yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              When team members @mention you in comments or notes, they'll appear here.
              You can use @Pat, @PatSmith, or @PatS to mention team members.
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