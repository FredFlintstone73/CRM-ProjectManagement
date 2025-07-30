import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmailNotification {
  id: number;
  emailInteractionId: number;
  isRead: boolean;
  email: {
    id: number;
    contactId: number;
    subject: string;
    sender: string;
    sentAt: string;
    emailType: string;
  };
}

export default function EmailNotificationIcon() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { data: notifications = [], isLoading } = useQuery<EmailNotification[]>({
    queryKey: ['/api/email-notifications'],
    refetchInterval: false, // Disable automatic polling temporarily
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate and refetch email notifications
      await queryClient.invalidateQueries({ queryKey: ['/api/email-notifications'] });
      // Also trigger a refresh of the email data
      await fetch('/api/email/refresh', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Error refreshing emails:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <Link href="/messages">
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2 hover:bg-gray-100"
          title="Email Messages"
        >
          <Mail className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </Link>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="p-2 hover:bg-gray-100"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh emails"
      >
        <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}