import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
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
  const { data: notifications = [], isLoading } = useQuery<EmailNotification[]>({
    queryKey: ['/api/email-notifications'],
    refetchInterval: 30000, // Check for new emails every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
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
  );
}