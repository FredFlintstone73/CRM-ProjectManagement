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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'this_week' | 'next_two_weeks' | 'next_month' | 'next_four_months' | 'custom'>('all');
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
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      case 'next_two_weeks':
        const twoWeeksFromNow = new Date(today);
        twoWeeksFromNow.setDate(today.getDate() + 14);
        twoWeeksFromNow.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: twoWeeksFromNow };
      case 'next_month':
        const oneMonthFromNow = new Date(today);
        oneMonthFromNow.setMonth(today.getMonth() + 1);
        oneMonthFromNow.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: oneMonthFromNow };
      case 'next_four_months':
        const fourMonthsFromNow = new Date(today);
        fourMonthsFromNow.setMonth(today.getMonth() + 4);
        fourMonthsFromNow.setHours(23, 59, 59, 999);
        return { start: startOfDay, end: fourMonthsFromNow };
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

  const filteredAndSortedTasks = tasks?.filter((task) => {
    const matchesSearch = searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompletion = 
      completionFilter === 'all' || 
      (completionFilter === 'completed' && task.status === 'completed') ||
      (completionFilter === 'pending' && task.status !== 'completed');

    const matchesDueDate = () => {
      if (dueDateFilter === 'all') return true;
      if (!task.dueDate) return false;
      
      const dateRange = getDateRangeForFilter(dueDateFilter);
      if (!dateRange) return false;
      
      const taskDueDate = new Date(task.dueDate);
      return taskDueDate >= dateRange.start && taskDueDate <= dateRange.end;
    };
    
    return matchesSearch && matchesCompletion && matchesDueDate();
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
      default:
        return 0;
    }
  }) || [];

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
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
                </SelectContent>
              </Select>
            </div>

            {/* Completion Filter */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Completion Status:</span>
              <RadioGroup
                value={completionFilter}
                onValueChange={(value) => setCompletionFilter(value as 'all' | 'completed' | 'pending')}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All Tasks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="completed" />
                  <Label htmlFor="completed">Completed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="pending" />
                  <Label htmlFor="pending">Pending</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Due Date Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <span className="text-sm font-medium">Due Date:</span>
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <Select value={dueDateFilter} onValueChange={(value) => setDueDateFilter(value as typeof dueDateFilter)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by due date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="next_two_weeks">Next Two Weeks</SelectItem>
                    <SelectItem value="next_month">Next Month</SelectItem>
                    <SelectItem value="next_four_months">Next Four Months</SelectItem>
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
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
            </div>
          </div>

          {/* Tasks Display */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <Link href={`/task/${task.id}`} className="flex-1">
                          <CardTitle className="text-lg hover:text-blue-600 cursor-pointer transition-colors">
                            {task.title}
                          </CardTitle>
                        </Link>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Badge className={getPriorityColor(task.priority || 25)}>
                          {task.priority || 25}
                        </Badge>
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
                    
                    <div className="flex items-center justify-between pt-2">
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
                        <Link href={`/task/${task.id}`}>
                          <span className="font-medium hover:text-blue-600 cursor-pointer transition-colors">
                            {task.title}
                          </span>
                        </Link>
                        <Badge className={getPriorityColor(task.priority || 25)}>
                          {task.priority || 25}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{getProjectName(task.projectId)}</span>
                        </div>
                        
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
