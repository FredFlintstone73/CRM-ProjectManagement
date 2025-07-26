import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Send, Reply, Forward, Clock, User, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EmailInteraction, Contact } from "@shared/schema";

const emailSchema = z.object({
  recipient: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  parentEmailId: z.number().optional(),
  emailType: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailInteractionsProps {
  contactId: number;
  contact: Contact;
  expandEmailId?: number;
}

export default function EmailInteractions({ contactId, contact, expandEmailId }: EmailInteractionsProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<EmailInteraction | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(
    // Pre-expand the thread if we have an expandEmailId
    expandEmailId ? new Set([expandEmailId]) : new Set()
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in EmailInteractions:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Get the contact's primary email
  const getContactEmail = () => {
    return contact.personalEmail || contact.workEmail || contact.spousePersonalEmail || "";
  };

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      recipient: getContactEmail(),
      subject: "",
      body: "",
    },
  });

  const { data: interactions = [], isLoading } = useQuery<EmailInteraction[]>({
    queryKey: ["/api/contacts", contactId, "emails"],
    staleTime: 2 * 60 * 1000, // 2 minutes for better performance
    gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    retry: 1, // Only retry once on failure
  });

  // Auto-expand the specified email when component mounts or data loads
  useEffect(() => {
    if (expandEmailId && interactions.length > 0) {
      // First, try to find a direct match (main email)
      const targetEmail = interactions.find(interaction => interaction.id === expandEmailId);
      if (targetEmail) {
        let threadToExpand: number;
        if (targetEmail.parentEmailId) {
          // This is a reply, so expand its parent thread
          threadToExpand = targetEmail.parentEmailId;
        } else {
          // This is a main email, expand it directly
          threadToExpand = expandEmailId;
        }
        
        setExpandedThreads(prev => new Set([...Array.from(prev), threadToExpand]));
        
        // Scroll to the email thread immediately for faster navigation
        requestAnimationFrame(() => {
          const emailElement = document.getElementById(`email-thread-${threadToExpand}`);
          if (emailElement) {
            emailElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        });
      }
    }
  }, [expandEmailId, interactions]);

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      try {
        const response = await apiRequest("POST", `/api/contacts/${contactId}/emails`, data);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Email mutation error:", error);
        throw error;
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "emails"] });
      setIsComposeOpen(false);
      setReplyingTo(null);
      form.reset({
        recipient: getContactEmail(),
        subject: "",
        body: "",
      });
      
      // Show appropriate message based on email sending result
      if (result.emailSent) {
        toast({
          title: "Email Sent",
          description: "Your email has been sent successfully and recorded.",
        });
      } else {
        toast({
          title: "Email Recorded",
          description: `Email interaction saved, but sending failed: ${result.message}`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Email send error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailFormData) => {
    try {
      sendEmailMutation.mutate(data);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "Failed to submit email form",
        variant: "destructive",
      });
    }
  };

  const handleCompose = () => {
    form.reset({
      recipient: getContactEmail(),
      subject: "",
      body: "",
    });
    setReplyingTo(null);
    setIsComposeOpen(true);
  };

  const handleAddReceived = () => {
    form.reset({
      recipient: getContactEmail(), // Set contact as sender for received email display
      subject: "",
      body: "",
      emailType: "received",
    });
    setReplyingTo(null);
    setIsComposeOpen(true);
  };

  const handleReply = (interaction: EmailInteraction) => {
    const replySubject = interaction.subject?.startsWith("Re: ") 
      ? interaction.subject 
      : `Re: ${interaction.subject}`;
    
    // Find the root email ID (parent email or the interaction itself if it's already a parent)
    const rootEmailId = interaction.parentEmailId || interaction.id;
    
    form.reset({
      recipient: extractEmailAddress(interaction.sender) || getContactEmail(),
      subject: replySubject,
      body: `\n\n--- Original Message ---\nFrom: ${interaction.sender}\nSubject: ${interaction.subject}\nDate: ${formatDate(interaction.sentAt || interaction.createdAt)}\n\n${interaction.body}`,
      parentEmailId: rootEmailId,
      emailType: 'reply',
    });
    setReplyingTo(interaction);
    setIsComposeOpen(true);
  };

  const handleForward = (interaction: EmailInteraction) => {
    const forwardSubject = interaction.subject?.startsWith("Fwd: ") 
      ? interaction.subject 
      : `Fwd: ${interaction.subject}`;
    
    form.reset({
      recipient: "",
      subject: forwardSubject,
      body: `\n\n--- Forwarded Message ---\nFrom: ${interaction.sender}\nTo: ${interaction.recipient}\nSubject: ${interaction.subject}\nDate: ${formatDate(interaction.sentAt || interaction.createdAt)}\n\n${interaction.body}`,
      emailType: 'forward',
    });
    setReplyingTo(null);
    setIsComposeOpen(true);
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract email address from "Name <email>" format
  const extractEmailAddress = (emailString: string | null) => {
    if (!emailString) return "";
    
    // Check if it's in "Name <email>" format
    const match = emailString.match(/<([^>]+)>/);
    if (match) {
      return match[1]; // Return just the email address
    }
    
    // If no angle brackets, assume it's already just an email
    return emailString;
  };

  const truncateBody = (body: string, maxLength: number = 150) => {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + "...";
  };

  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/contacts/${contactId}/emails/${emailId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Delete email mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "emails"] });
      toast({
        title: "Email Deleted",
        description: "Email interaction has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete email",
        variant: "destructive",
      });
    },
  });

  const toggleThread = (emailId: number) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedThreads(newExpanded);
  };

  const handleDelete = (emailId: number) => {
    if (confirm("Are you sure you want to delete this email interaction?")) {
      try {
        deleteEmailMutation.mutate(emailId);
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Error",
          description: "Failed to delete email",
          variant: "destructive",
        });
      }
    }
  };

  // Group emails by conversation thread
  const groupedInteractions = () => {
    // First, deduplicate interactions to handle IMAP duplicate issues
    const uniqueInteractions = interactions.filter((interaction, index, arr) => {
      // Find if there's another interaction with same key attributes
      const duplicateIndex = arr.findIndex(other => 
        other.contactId === interaction.contactId &&
        other.parentEmailId === interaction.parentEmailId &&
        other.subject === interaction.subject &&
        other.sender === interaction.sender &&
        other.sentAt === interaction.sentAt &&
        other.emailType === interaction.emailType
      );
      // Keep only the first occurrence (lowest index)
      return duplicateIndex === index;
    });

    const groups: { [key: number]: EmailInteraction[] } = {};
    const threaded: number[] = [];
    
    // First, group replies with their parent emails
    uniqueInteractions.forEach(interaction => {
      if (interaction.parentEmailId) {
        if (!groups[interaction.parentEmailId]) {
          groups[interaction.parentEmailId] = [];
        }
        groups[interaction.parentEmailId].push(interaction);
        threaded.push(interaction.id);
      }
    });
    
    // Then add parent emails and standalone emails
    const result: (EmailInteraction & { replies?: EmailInteraction[] })[] = [];
    uniqueInteractions.forEach(interaction => {
      if (!threaded.includes(interaction.id)) {
        result.push({
          ...interaction,
          replies: (groups[interaction.id] || []).sort((a, b) => 
            new Date(a.sentAt || a.createdAt || '').getTime() - new Date(b.sentAt || b.createdAt || '').getTime()
          )
        });
      }
    });
    
    return result.sort((a, b) => 
      new Date(b.sentAt || b.createdAt || '').getTime() - new Date(a.sentAt || a.createdAt || '').getTime()
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Interactions
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
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
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Interactions
          </span>
          <div className="flex space-x-2">
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCompose}>
                  <Send className="h-4 w-4 mr-2" />
                  Compose Email
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {replyingTo ? "Reply to Email" : "Compose Email"}
                </DialogTitle>
                <DialogDescription>
                  {replyingTo 
                    ? `Replying to: ${replyingTo.subject}` 
                    : `Send an email to ${contact.firstName} ${contact.lastName}`}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recipient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="recipient@example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Email subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Type your message here..." 
                            rows={10}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsComposeOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sendEmailMutation.isPending}>
                      <Send className="h-4 w-4 mr-2" />
                      {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Email Interactions</h3>
            <p>Send your first email to start building interaction history.</p>
            <Button 
              className="mt-4" 
              onClick={handleCompose}
              disabled={!getContactEmail()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            {!getContactEmail() && (
              <p className="text-sm text-muted-foreground mt-2">
                Add an email address to this contact to send emails
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {groupedInteractions().map((interaction) => (
              <div key={interaction.id} id={`email-thread-${interaction.id}`}>
                {/* Main Email */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-1 mb-1 flex-wrap gap-1">
                          {interaction.replies && interaction.replies.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleThread(interaction.id)}
                              className="h-5 w-5 p-0"
                            >
                              {expandedThreads.has(interaction.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {interaction.sender === contact.personalEmail || 
                             interaction.sender === contact.workEmail || 
                             interaction.sender === contact.spousePersonalEmail ? "Received" : "Sent"}
                          </Badge>
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            <User className="h-3 w-3 mr-1" />
                            {interaction.sender}
                          </Badge>
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            <Mail className="h-3 w-3 mr-1" />
                            To: {interaction.recipient}
                          </Badge>
                          <Badge variant="secondary" className="text-xs py-0 px-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(interaction.sentAt || interaction.createdAt)}
                          </Badge>
                          {interaction.replies && interaction.replies.length > 0 && (
                            <Badge variant="secondary" className="text-xs py-0 px-1">
                              {interaction.replies.length} {interaction.replies.length === 1 ? 'reply' : 'replies'}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm mt-[0px] mb-[0px]">{interaction.subject}</h4>
                        <p className="text-muted-foreground text-[12px]">
                          {truncateBody(interaction.body || "")}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReply(interaction)}
                          className="h-6 px-2 text-xs"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleForward(interaction)}
                          className="h-6 px-2 text-xs"
                        >
                          <Forward className="h-3 w-3 mr-1" />
                          Forward
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(interaction.id)}
                          className="h-6 px-1 text-red-600 hover:text-red-700 text-xs"
                          disabled={deleteEmailMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {interaction.body && interaction.body.length > 150 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                          Show full message
                        </summary>
                        <div className="mt-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                          {interaction.body}
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>

                {/* Replies */}
                {interaction.replies && interaction.replies.length > 0 && expandedThreads.has(interaction.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {interaction.replies
                      .sort((a, b) => new Date(a.sentAt || a.createdAt || '').getTime() - new Date(b.sentAt || b.createdAt || '').getTime())
                      .map((reply) => (
                      <Card key={reply.id} className="border-l-4 border-l-green-500">
                        <CardContent className="py-2 px-3">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1">
                              <div className="flex items-center space-x-1 mb-1 flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs py-0 px-1">
                                  Reply
                                </Badge>
                                <Badge variant="outline" className="text-xs py-0 px-1">
                                  <User className="h-3 w-3 mr-1" />
                                  {reply.sender}
                                </Badge>
                                <Badge variant="outline" className="text-xs py-0 px-1">
                                  <Mail className="h-3 w-3 mr-1" />
                                  To: {reply.recipient}
                                </Badge>
                                <Badge variant="secondary" className="text-xs py-0 px-1">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDate(reply.sentAt || reply.createdAt)}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-sm mt-[0px] mb-[0px]">{reply.subject}</h4>
                              <p className="text-muted-foreground text-[12px]">
                                {truncateBody(reply.body || "")}
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReply(reply)}
                                className="h-6 px-2 text-xs"
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleForward(reply)}
                                className="h-6 px-2 text-xs"
                              >
                                <Forward className="h-3 w-3 mr-1" />
                                Forward
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(reply.id)}
                                className="h-6 px-1 text-red-600 hover:text-red-700 text-xs"
                                disabled={deleteEmailMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {reply.body && reply.body.length > 150 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-[12px]">
                                Show full message
                              </summary>
                              <div className="mt-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                                {reply.body}
                              </div>
                            </details>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}