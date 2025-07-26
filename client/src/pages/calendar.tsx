import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar as CalendarIcon, Plus, Trash2, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CalendarConnection } from "@shared/schema";

const calendarProviders = [
  { value: "google", label: "Google Calendar", supportsOAuth: true },
  { value: "microsoft", label: "Microsoft Outlook", supportsOAuth: true },
  { value: "apple", label: "Apple Calendar", supportsOAuth: false },
  { value: "other", label: "Other", supportsOAuth: false },
];

const connectionSchema = z.object({
  provider: z.enum(["google", "outlook", "apple", "other"]),
  calendarName: z.string().min(1, "Calendar name is required"),
  calendarId: z.string().optional(),
  syncEnabled: z.boolean().default(true),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;

export default function CalendarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Add error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in Calendar:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      provider: "google" as const,
      calendarName: "",
      calendarId: "",
      syncEnabled: true,
    },
  });

  const { data: connections = [], isLoading } = useQuery<CalendarConnection[]>({
    queryKey: ["/api/calendar/connections"],
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      // Check if provider supports OAuth
      const provider = calendarProviders.find(p => p.value === data.provider);
      
      if (provider?.supportsOAuth && ['google', 'microsoft'].includes(data.provider)) {
        // Start OAuth flow
        const response = await apiRequest("GET", `/api/oauth/${data.provider}/auth`);
        const oauthData = await response.json();
        
        if (oauthData.authUrl) {
          // Redirect to OAuth provider
          window.location.href = oauthData.authUrl;
          return { oauth: true };
        } else {
          throw new Error(oauthData.message || "OAuth not configured");
        }
      } else {
        // Create manual connection for non-OAuth providers
        const response = await apiRequest("POST", "/api/calendar/connections", data);
        return response.json();
      }
    },
    onSuccess: (data: any) => {
      if (!data.oauth) {
        queryClient.invalidateQueries({ queryKey: ["/api/calendar/connections"] });
        setDialogOpen(false);
        form.reset({
          provider: "google" as const,
          calendarName: "",
          calendarId: "",
          syncEnabled: true,
        });
        toast({
          title: "Calendar Connected",
          description: "Your calendar has been connected successfully.",
        });
      }
      // OAuth success will be handled by redirect callback
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect calendar",
        variant: "destructive",
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/calendar/connections/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/connections"] });
      toast({
        title: "Calendar Disconnected",
        description: "Calendar connection has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to remove calendar connection",
        variant: "destructive",
      });
    },
  });

  const syncConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/calendar/sync/${id}`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/connections"] });
      
      const eventsCount = data.eventsCount || 0;
      const projectEvents = data.projectEvents || 0;
      const taskEvents = data.taskEvents || 0;
      
      const syncStatus = data.realSync ? "to your calendar" : "(preview mode)";
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${eventsCount} calendar events ${syncStatus} (${projectEvents} projects, ${taskEvents} tasks)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync calendar",
        variant: "destructive",
      });
    },
  });

  const updateSyncMutation = useMutation({
    mutationFn: async ({ id, syncEnabled }: { id: number; syncEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/calendar/connections/${id}`, { syncEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/connections"] });
      toast({
        title: "Settings Updated",
        description: "Calendar sync settings have been updated.",
      });
    },
  });

  const onSubmit = async (data: ConnectionFormData) => {
    try {
      await createConnectionMutation.mutateAsync(data);
    } catch (error) {
      console.error("Calendar connection error:", error);
      // Error handling is already in the mutation's onError callback
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to disconnect this calendar?")) {
      deleteConnectionMutation.mutate(id);
    }
  };

  const handleSync = (id: number) => {
    syncConnectionMutation.mutate(id);
  };

  const handleSyncToggle = (id: number, syncEnabled: boolean) => {
    updateSyncMutation.mutate({ id, syncEnabled });
  };

  const getProviderLabel = (provider: string) => {
    return calendarProviders.find(p => p.value === provider)?.label || provider;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "🗓️";
      case "outlook":
        return "📅";
      case "apple":
        return "🍎";
      default:
        return "🗓️";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Calendar Integration</h1>
            <p className="text-muted-foreground">
              Connect your calendars to sync project due dates and task deadlines
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar Integration</h1>
          <p className="text-muted-foreground">
            Connect your calendars to sync project due dates and task deadlines
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Connect Calendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Calendar</DialogTitle>
              <DialogDescription>
                Add a new calendar connection to sync your project dates and task deadlines.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a calendar provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {calendarProviders.map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calendarName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="My Work Calendar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calendarId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar ID (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="your-email@domain.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syncEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Sync</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Automatically sync project dates and task deadlines
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createConnectionMutation.isPending}>
                    {createConnectionMutation.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Calendar Connections</h3>
            <p className="text-muted-foreground mb-4">
              Connect your calendar to automatically sync project due dates and task deadlines.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Calendar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getProviderIcon(connection.provider)}</span>
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{connection.calendarName}</span>
                        <Badge variant={connection.isActive ? "default" : "secondary"}>
                          {connection.isActive ? "Connected" : "Disconnected"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {getProviderLabel(connection.provider)}
                        {connection.calendarId && ` • ${connection.calendarId}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Sync</span>
                      <Switch
                        checked={connection.syncEnabled ?? false}
                        onCheckedChange={(checked) => handleSyncToggle(connection.id, checked)}
                        disabled={updateSyncMutation.isPending}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={syncConnectionMutation.isPending || !connection.syncEnabled}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(connection.id)}
                      disabled={deleteConnectionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span> {connection.createdAt ? new Date(connection.createdAt).toLocaleDateString() : "Unknown"}
                  </div>
                  <div>
                    <span className="font-medium">Last Sync:</span>{" "}
                    {connection.lastSyncAt
                      ? new Date(connection.lastSyncAt).toLocaleDateString()
                      : "Never"}
                  </div>
                </div>
                {connection.settings && (
                  <div className="mt-4">
                    <details className="group">
                      <summary className="flex items-center space-x-2 cursor-pointer text-sm font-medium">
                        <Settings className="h-4 w-4" />
                        <span>Connection Settings</span>
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded text-xs">
                        <pre>{JSON.stringify(connection.settings, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Events Preview Section */}
      {connections.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Calendar Events Preview</span>
            </CardTitle>
            <CardDescription>
              These are your assigned tasks and project meetings that would be synced to your calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarEventsPreview />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Calendar Events Preview Component
function CalendarEventsPreview() {
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const projectEvents = projects.filter(p => p.dueDate).map(project => ({
    type: 'project' as const,
    title: `Project Due: ${project.name}`,
    date: project.dueDate,
    projectName: project.name,
    icon: '📋'
  }));

  // Get current user's contact ID to filter tasks
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: userContactId } = useQuery({
    queryKey: ["/api/auth/contact-id"],
    enabled: !!user?.id,
  });

  // Filter tasks to only show those assigned to current user
  const userTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    if (!task.assignedTo || !userContactId) return false;
    return task.assignedTo.includes(userContactId);
  });

  const taskEvents = userTasks.map(task => ({
    type: 'task' as const,
    title: `Task Due: ${task.title}`,
    date: task.dueDate,
    taskTitle: task.title,
    icon: '✅'
  }));

  const allEvents = [...projectEvents, ...taskEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10); // Show first 10 upcoming events

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Events to Sync</h3>
        <p className="text-muted-foreground">
          No projects or tasks assigned to you with due dates found. Tasks must be assigned to you to appear in your calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Next {allEvents.length} upcoming events (assigned to you)</span>
        <span>{projectEvents.length} projects, {taskEvents.length} tasks</span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        • Project meetings: 7:00 AM - 8:00 AM<br />
        • Task deadlines: 5:00 PM - 5:30 PM
      </div>
      <div className="space-y-2">
        {allEvents.map((event, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
            <span className="text-xl">{event.icon}</span>
            <div className="flex-1">
              <p className="font-medium">{event.title}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Badge variant={event.type === 'project' ? 'default' : 'secondary'}>
              {event.type}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}