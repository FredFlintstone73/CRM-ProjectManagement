import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Toggle } from "@/components/ui/toggle";

import { Search, Plus, User, AlertCircle, Grid, List, Edit, Trash2, CalendarDays, CheckCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import TaskForm from "@/components/tasks/task-form";
import type { Task, Project, User as UserType } from "@shared/schema";
import { Link } from "wouter";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [sortBy, setSortBy] = useState("priority");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'my_tasks' | 'all_tasks'>('all_tasks');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'this_week' | 'next_two_weeks' | 'next_30_days' | 'next_122_days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: isAuthenticated,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  const { data: contacts } = useQuery({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const toggleTaskCompletion = useMutation({
    mutationFn: (task: Task) => 
      apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: task.status === 'completed' ? 'todo' : 'completed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });



  const getDateRangeForFilter = (filter: typeof dueDateFilter) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    switch (filter) {
      case 'today':
        return { start: startOfDay, end: endOfDay };
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday of this week
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday of this week
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      case 'next_two_weeks':
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() - today.getDay() + 1); // Monday of this week
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        const endOfTwoWeeks = new Date(startOfCurrentWeek);
        endOfTwoWeeks.setDate(startOfCurrentWeek.getDate() + 13); // Sunday of next week
        endOfTwoWeeks.setHours(23, 59, 59, 999);
        return { start: startOfCurrentWeek, end: endOfTwoWeeks };
      case 'next_30_days':
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: thirtyDaysFromNow };
      case 'next_122_days':
        const oneHundredTwentyTwoDaysFromNow = new Date(today);
        oneHundredTwentyTwoDaysFromNow.setDate(today.getDate() + 122);
        oneHundredTwentyTwoDaysFromNow.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: oneHundredTwentyTwoDaysFromNow };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return null;
      default:
        return null;
    }
  };

  const getCurrentUserContactId = () => {
    if (!user || !contacts) return null;
    const userContact = contacts.find((contact: any) => 
      contact.personalEmail === user.email || 
      contact.workEmail === user.email
    );
    return userContact?.id || null;
  };

  const filteredAndSortedTasks = tasks?.filter((task) => {
    const matchesSearch = searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompletion = 
      completionFilter === 'all' || 
      (completionFilter === 'completed' && task.status === 'completed') ||
      (completionFilter === 'in_progress' && task.status !== 'completed');

    const matchesTaskFilter = () => {
      if (taskFilter === 'all_tasks') return true;
      if (taskFilter === 'my_tasks') {
        const currentUserContactId = getCurrentUserContactId();
        return currentUserContactId && task.assignedTo === currentUserContactId;
      }
      return true;
    };

    const matchesDueDate = () => {
      if (dueDateFilter === 'all') return true;
      if (!task.dueDate) return false;
      
      const dateRange = getDateRangeForFilter(dueDateFilter);
      if (!dateRange) return false;
      
      const taskDueDate = new Date(task.dueDate);
      return taskDueDate >= dateRange.start && taskDueDate <= dateRange.end;
    };
    
    return matchesSearch && matchesCompletion && matchesTaskFilter() && matchesDueDate();
  }).sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return (a.priority || 50) - (b.priority || 50); // Sort 1-50, with null/undefined treated as 50
      case "dueDate":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      case "assignee":
        const getAssigneeName = (taskId: number) => {
          const task = tasks?.find(t => t.id === taskId);
          if (!task?.assignedTo || !contacts) return 'Unassigned';
          const assignee = contacts.find((c: any) => c.id === task.assignedTo);
          return assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned';
        };
        return getAssigneeName(a.id).localeCompare(getAssigneeName(b.id));
      default:
        return 0;
    }
  }) || [];

  // Calculate progress for tasks assigned to current user only, considering due date filter
  const getCurrentUserTaskProgress = () => {
    if (!tasks || !user || !contacts) return { completed: 0, total: 0, percentage: 0 };
    
    const currentUserContactId = getCurrentUserContactId();
    if (!currentUserContactId) return { completed: 0, total: 0, percentage: 0 };
    
    // Filter tasks by current user assignment
    let myTasks = tasks.filter(task => task.assignedTo === currentUserContactId);
    
    // Apply due date filter if not 'all'
    if (dueDateFilter !== 'all') {
      const dateRange = getDateRangeForFilter(dueDateFilter);
      if (dateRange) {
        myTasks = myTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDueDate = new Date(task.dueDate);
          return taskDueDate >= dateRange.start && taskDueDate <= dateRange.end;
        });
      }
    }
    
    const completedTasks = myTasks.filter(task => task.status === 'completed');
    
    return {
      completed: completedTasks.length,
      total: myTasks.length,
      percentage: myTasks.length > 0 ? (completedTasks.length / myTasks.length) * 100 : 0
    };
  };

  const myTaskProgress = getCurrentUserTaskProgress();

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 10) {
      return 'bg-green-100 text-green-800';
    } else if (priority <= 20) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (priority <= 35) {
      return 'bg-orange-100 text-orange-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId || !projects) return 'No project assigned';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown project';
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleTaskCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  if (isLoading || tasksLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Tasks" 
        subtitle="Manage and track your project tasks"
        showActions={false}
      />
      
      <main className="flex-1 bg-gray-50">
        <div className="px-6 py-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Sort by Priority</SelectItem>
                <SelectItem value="dueDate">Sort by Due Date</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
                <SelectItem value="assignee">Sort by Assignee</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'row' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('row')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <TaskForm onSuccess={handleTaskCreated} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* My Task Progress Bar - Only show when viewing My Tasks */}
          {taskFilter === 'my_tasks' && myTaskProgress.total > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">My Task Progress</h3>
                  <span className="text-sm text-gray-600">
                    {myTaskProgress.completed} of {myTaskProgress.total} completed
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress 
                    value={myTaskProgress.percentage} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{myTaskProgress.percentage.toFixed(1)}% Complete</span>
                    <span>{myTaskProgress.total - myTaskProgress.completed} remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Assignment Toggles and Filters */}
          <div className="flex flex-wrap items-center gap-4 justify-between mb-6">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center mr-2">Show:</span>
              <Toggle
                pressed={taskFilter === 'my_tasks'}
                onPressedChange={() => setTaskFilter(taskFilter === 'my_tasks' ? 'all_tasks' : 'my_tasks')}
                variant="outline"
                className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800"
              >
                My Tasks
              </Toggle>
              <Toggle
                pressed={taskFilter === 'all_tasks'}
                onPressedChange={() => setTaskFilter(taskFilter === 'all_tasks' ? 'my_tasks' : 'all_tasks')}
                variant="outline"
                className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800"
              >
                All Tasks
              </Toggle>
            </div>

            {/* Completion Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Toggle
                pressed={completionFilter === 'all'}
                onPressedChange={() => setCompletionFilter('all')}
                variant="outline"
                className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800"
              >
                All
              </Toggle>
              <Toggle
                pressed={completionFilter === 'in_progress'}
                onPressedChange={() => setCompletionFilter('in_progress')}
                variant="outline"
                className="data-[state=on]:bg-yellow-100 data-[state=on]:text-yellow-800"
              >
                In Progress
              </Toggle>
              <Toggle
                pressed={completionFilter === 'completed'}
                onPressedChange={() => setCompletionFilter('completed')}
                variant="outline"
                className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800"
              >
                Completed
              </Toggle>
            </div>

            {/* Due Date Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Due Date:</span>
              <Select value={dueDateFilter} onValueChange={(value) => setDueDateFilter(value as typeof dueDateFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by due date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="next_two_weeks">Next Two Weeks</SelectItem>
                  <SelectItem value="next_30_days">Next 30 Days</SelectItem>
                  <SelectItem value="next_122_days">Next 122 Days</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
              {dueDateFilter === 'custom' && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "MMM d") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "MMM d") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Edit Task Dialog */}
          <Dialog open={editingTask !== null} onOpenChange={(open) => !open && setEditingTask(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>
              {editingTask && (
                <TaskForm 
                  task={editingTask} 
                  projectId={editingTask.projectId} 
                  onSuccess={() => {
                    setEditingTask(null);
                    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
                  }} 
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Tasks Display */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1 gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 mt-0.5"
                          onClick={() => toggleTaskCompletion.mutate(task)}
                          disabled={toggleTaskCompletion.isPending}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <Badge className={getPriorityColor(task.priority || 25)}>
                          {task.priority || 25}
                        </Badge>
                        <Link href={`/task/${task.id}`} className="flex-1">
                          <CardTitle className="text-lg hover:text-blue-600 cursor-pointer transition-colors task-title">
                            {task.title}
                          </CardTitle>
                        </Link>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-2">{task.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{getProjectName(task.projectId)}</span>
                    </div>
                    
                    {task.assignedTo && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>Assigned to: {(() => {
                          const assignee = contacts?.find((c: any) => c.id === task.assignedTo);
                          return assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unknown';
                        })()}</span>
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className="flex items-center space-x-2 text-sm">
                        <CalendarDays className="w-4 h-4" />
                        <span className={isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-600'}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue(task.dueDate) && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end pt-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleTaskCompletion.mutate(task)}
                          disabled={toggleTaskCompletion.isPending}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <Badge className={getPriorityColor(task.priority || 25)}>
                          {task.priority || 25}
                        </Badge>
                        <Link href={`/task/${task.id}`}>
                          <span className="font-medium hover:text-blue-600 cursor-pointer transition-colors task-title">
                            {task.title}
                          </span>
                        </Link>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{getProjectName(task.projectId)}</span>
                        </div>
                        
                        {task.assignedTo && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{(() => {
                              const assignee = contacts?.find((c: any) => c.id === task.assignedTo);
                              return assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unknown';
                            })()}</span>
                          </div>
                        )}
                        
                        {task.dueDate && (
                          <div className="flex items-center space-x-2 text-sm">
                            <CalendarDays className="w-4 h-4" />
                            <span className={isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-600'}>
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                            {isOverdue(task.dueDate) && (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredAndSortedTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No tasks found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
