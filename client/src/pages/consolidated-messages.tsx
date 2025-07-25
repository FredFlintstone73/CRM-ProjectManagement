import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, User, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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

export default function ConsolidatedMessages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<EmailNotification[]>({
    queryKey: ['/api/email-notifications'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest('PATCH', `/api/email-notifications/${notificationId}/mark-read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to mark email as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
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

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Email Messages</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Messages</h1>
          <p className="text-gray-600 mt-1">
            Consolidated view of all received emails from contacts
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read ({unreadCount})
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Email Messages</h3>
            <p className="text-gray-600">
              When contacts email you, their messages will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const email = notification.email;
            const contact = email.contact;
            
            return (
              <Card 
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-md ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.familyName && (
                            <span className="text-sm text-gray-500">
                              ({contact.familyName})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <Badge 
                          variant={email.emailType === 'received' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {email.emailType === 'received' ? 'New Email' : 'Reply'}
                        </Badge>
                        
                        {!notification.isRead && (
                          <Badge variant="destructive" className="text-xs">
                            Unread
                          </Badge>
                        )}
                      </div>
                      
                      <Link
                        href={`/contacts/${email.contactId}`}
                        className="block"
                      >
                        <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                          {email.subject || '(No Subject)'}
                        </h3>
                      </Link>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        From: {email.sender}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      
                      <Link href={`/contacts/${email.contactId}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          View in Contact
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}