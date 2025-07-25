import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Activity, Users, Clock, MapPin, Monitor, RefreshCw, Globe } from "lucide-react";
import { format } from "date-fns";
import type { UserActivity } from "@shared/schema";

export default function Administration() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("24h");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    // Check if user is administrator
    if (user?.accessLevel !== 'administrator') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      window.location.href = "/";
      return;
    }
  }, [isAuthenticated, user, toast]);

  const { data: activities = [], isLoading, refetch } = useQuery<UserActivity[]>({
    queryKey: ['/api/administration/activities', { timeRange, actionFilter, userFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        actionFilter,
        userFilter
      });
      const response = await fetch(`/api/administration/activities?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      return response.json();
    },
    enabled: isAuthenticated && user?.accessLevel === 'administrator',
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/administration/stats', { timeRange }],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange });
      const response = await fetch(`/api/administration/stats?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
    enabled: isAuthenticated && user?.accessLevel === 'administrator',
    staleTime: 60000, // 1 minute
  });

  const handleRefresh = () => {
    refetch();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'page_view': return 'bg-blue-100 text-blue-800';
      case 'api_call': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), 'MMM d, yyyy h:mm:ss a');
  };

  // IP Geolocation lookup hook
  const useIPLocation = (ipAddress: string) => {
    return useQuery({
      queryKey: ['ip-location', ipAddress],
      queryFn: async () => {
        if (!ipAddress || ipAddress === '-') return null;
        
        try {
          // Using ipapi.co (free, HTTPS supported)
          const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
          const data = await response.json();
          
          if (!data.error) {
            return {
              country: data.country_name,
              region: data.region,
              city: data.city,
              latitude: data.latitude,
              longitude: data.longitude,
              timezone: data.timezone,
              isp: data.org,
              location: `${data.city}, ${data.region}, ${data.country_name}`
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      },
      enabled: !!ipAddress && ipAddress !== '-',
      staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
      gcTime: 24 * 60 * 60 * 1000,
    });
  };

  // Component for IP address with location
  const IPAddressCell = ({ ipAddress }: { ipAddress: string }) => {
    const { data: location, isLoading } = useIPLocation(ipAddress);
    
    if (!ipAddress || ipAddress === '-') {
      return <span className="font-mono text-sm">-</span>;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 font-mono text-sm cursor-help">
              <Globe className="h-3 w-3 text-muted-foreground" />
              {ipAddress}
              {isLoading && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {location ? (
              <div className="space-y-1 text-xs">
                <div className="font-semibold">{location.location}</div>
                <div>ISP: {location.isp}</div>
                <div>Timezone: {location.timezone}</div>
                <div className="text-muted-foreground">
                  {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                </div>
              </div>
            ) : (
              <div className="text-xs">Location lookup failed</div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (!isAuthenticated || user?.accessLevel !== 'administrator') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-muted-foreground">Monitor user activity and system access</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivities || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loginSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueIPs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionFilter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="page_view">Page Views</SelectItem>
                  <SelectItem value="api_call">API Calls</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userFilter">User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {/* Add dynamic user options here */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No activities found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(activity.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            {activity.userId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(activity.action)}>
                            {activity.action.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {activity.resource || '-'}
                        </TableCell>
                        <TableCell>
                          <IPAddressCell ipAddress={activity.ipAddress || '-'} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {activity.userAgent || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}