import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserContact } from "@/hooks/useCurrentUserContact";

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

import { Search, Plus, User, AlertCircle, Grid, List, Edit, Trash2, CalendarDays, CheckCircle, Circle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import TaskForm from "@/components/tasks/task-form";
import { UserPriorityInput } from "@/components/tasks/user-priority-input";
import { TaskDetailSidebar } from "@/components/tasks/task-detail-sidebar";
import { OptimisticTaskToggle } from "@/components/tasks/optimistic-task-toggle";
import { getDueDateBadgeProps } from "@/lib/dueDateUtils";
import type { Task, Project, Contact, User as UserType } from "@shared/schema";
import { Link, useLocation } from "wouter";

export default function Tasks() {

  const { isAuthenticated, isLoading, user } = useAuth();
  const { contactId: currentUserContactId, isUserAssignedToTask } = useCurrentUserContact();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  const [sortConfig, setSortConfig] = useState<{
    key: 'priority' | 'dueDate' | 'title' | 'assignee' | 'familyName' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'priority', direction: 'asc' });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<'my_tasks' | 'all_tasks'>('my_tasks');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'completed' | 'in_progress' | 'overdue'>('in_progress');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'this_week' | 'next_two_weeks' | 'next_30_days' | 'next_122_days' | 'custom'>('next_30_days');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  // Task sidebar state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState<Set<number>>(new Set());

  // Handler for enhanced task navigation
  const handleTaskClick = (task: Task) => {
    // Only apply enhanced navigation when in "My Tasks" filter mode
    if (taskFilter === 'my_tasks') {
      const familyName = getTaskFamilyName(task);
      
      // If task has no family/client (No Client), open full task detail page with context
      if (!familyName || familyName === '' || familyName === 'No Client') {
        // Store context information for the back button
        localStorage.setItem('taskDetailSource', 'my-tasks-no-client');
        setLocation(`/task/${task.id}`);
        return;
      }
      
      // If task has a family name, navigate to project and expand to show the task
      if (task.projectId) {
        // Store the task ID to expand to in localStorage for the project page to use
        localStorage.setItem('expandToTaskId', task.id.toString());
        setLocation(`/projects/${task.projectId}`);
        return;
      }
    }
    
    // Default behavior: clear any existing context and open sidebar
    localStorage.removeItem('taskDetailSource');
    setSelectedTask(task);
    setIsSidebarOpen(true);
  };

  // Handler for closing sidebar
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedTask(null);
  };

  // Handler for task updates from sidebar
  const handleTaskUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  // Toggle assignment expansion for specific task
  const toggleAssignmentExpansion = (taskId: number) => {
    setExpandedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds - shorter cache for more consistent updates
    gcTime: 300000 // 5 minutes
  });

  // Get tasks with user-specific priorities when viewing "My Tasks"
  const { data: userTasksWithPriorities } = useQuery<(Task & { userPriority: number | null })[]>({
    queryKey: ['/api/tasks/my-tasks-with-priorities'],
    enabled: isAuthenticated && taskFilter === 'my_tasks',
    staleTime: 30000, // 30 seconds - shorter cache for more consistent updates
    gcTime: 300000 // 5 minutes
  });

  // Use appropriate task data based on filter
  const tasks = taskFilter === 'my_tasks' 
    ? (userTasksWithPriorities || []) 
    : (allTasks || []);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
    staleTime: 120000, // 2 minutes
    gcTime: 600000 // 10 minutes
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
    staleTime: 120000, // 2 minutes
    gcTime: 600000 // 10 minutes
  });

  // Helper function to format role names
  const formatRole = (role: string) => {
    if (!role) return '';
    
    switch (role) {
      case 'accountant':
        return 'Accountant';
      case 'admin_assistant':
        return 'Admin Assistant';
      case 'client_service_member':
        return 'Client Service Member';
      case 'deliverables_team_coordinator':
        return 'Deliverables Team Coordinator';
      case 'estate_attorney':
        return 'Estate Attorney';
      case 'estate_planner':
        return 'Estate Planner';
      case 'financial_planner':
        return 'Financial Planner';
      case 'human_relations':
        return 'Human Relations';
      case 'insurance_business':
        return 'Insurance - Business';
      case 'insurance_health':
        return 'Insurance - Health';
      case 'insurance_life_ltc_disability':
        return 'Insurance - Life, LTC, & Disability';
      case 'insurance_pc':
        return 'Insurance - P&C';
      case 'loan_officer':
        return 'Loan Officer';
      case 'marketing_director':
        return 'Marketing Director';
      case 'money_manager':
        return 'Money Manager';
      case 'strategic_relations_director':
        return 'Strategic Relations Director';
      case 'tax_planner':
        return 'Tax Planner';
      case 'trusted_advisor':
        return 'Trusted Advisor';
      case 'other':
        return 'Other';
      default:
        return role?.charAt(0).toUpperCase() + role?.slice(1) || '';
    }
  };

  // Function to get family name from task's project
  const getTaskFamilyName = (task: Task): string => {
    // No project assigned - likely a template task or standalone task
    if (!task.projectId || !projects) return '';
    
    const project = projects.find(p => p.id === task.projectId);
    
    // Project found but no client assigned
    if (!project?.clientId || !contacts) return '';
    
    const client = contacts?.find((c: Contact) => c.id === project.clientId);
    
    // Client not found
    if (!client) return '';
    
    // If client has family name, use it
    if (client.familyName) {
      return client.familyName;
    }
    
    // If no family name but has last name, use last name
    if (client.lastName) {
      return client.lastName;
    }
    
    // If no last name but has first name, use first name
    if (client.firstName) {
      return client.firstName;
    }
    
    return '';
  };

  // Get all assigned team members from direct assignments and role assignments
  const getTaskAssignedMembers = (taskData: any): Contact[] => {
    if (!contacts?.length) return [];
    
    const teamMembers = contacts.filter((contact: Contact) => contact.contactType === 'team_member' && contact.status === 'active');
    const assignedMembers: Contact[] = [];
    
    // Add directly assigned team members (by contact ID)
    if (taskData.assignedTo) {
      const assignedIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [taskData.assignedTo];
      assignedIds.forEach((contactId: any) => {
        if (contactId) {
          const member = teamMembers.find((tm: Contact) => tm.id === contactId);
          if (member) assignedMembers.push(member);
        }
      });
    }
    
    // Add team members assigned by role
    if (taskData.assignedToRole) {
      const assignedRoles = Array.isArray(taskData.assignedToRole) ? taskData.assignedToRole : [taskData.assignedToRole];
      assignedRoles.forEach((role: any) => {
        if (role) {
          const roleMembers = teamMembers.filter((tm: Contact) => tm.role === role);
          roleMembers.forEach((member: Contact) => {
            // Only add if not already in the list (avoid duplicates)
            if (!assignedMembers.find((am: Contact) => am.id === member.id)) {
              assignedMembers.push(member);
            }
          });
        }
      });
    }
    
    return assignedMembers;
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onMutate: async (taskId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      await queryClient.cancelQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      
      // Snapshot the previous values
      const previousTasks = queryClient.getQueryData(['/api/tasks']);
      const previousMyTasks = queryClient.getQueryData(['/api/tasks/my-tasks-with-priorities']);
      
      // Optimistically remove the task from both caches
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.filter(task => task.id !== taskId);
      });
      
      queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.filter(task => task.id !== taskId);
      });
      
      // Return context object with the snapshotted values
      return { previousTasks, previousMyTasks };
    },
    onSuccess: () => {
      // Invalidate Messages & Notifications queries to remove deleted tasks
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mentions'] });
    },
    onError: (error, taskId, context) => {
      // Revert optimistic updates on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['/api/tasks'], context.previousTasks);
      }
      if (context?.previousMyTasks) {
        queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], context.previousMyTasks);
      }
      
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const toggleTaskCompletion = useMutation({
    mutationFn: async (task: Task) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: task.status === 'completed' ? 'todo' : 'completed',
      });
      const updatedTask = await response.json();
      return { updatedTask, originalTask: task };
    },
    onSuccess: ({ updatedTask, originalTask }) => {
      // Force immediate re-fetch for instant UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      if (originalTask?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', originalTask.projectId, 'tasks'] });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      
      // Invalidate notification queries so overdue tasks update immediately
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mentions'] });
    },
    onError: (error) => {
      // On error, revert optimistic updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
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



  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];
    

    
    // Pre-compute values for better performance
    const searchLower = searchQuery.toLowerCase();
    const hasSearch = searchQuery !== "";
    const currentDate = new Date();
    
    const filtered = tasks.filter((task) => {
      // Search filtering with early returns
      if (hasSearch) {
        if (!task.title.toLowerCase().includes(searchLower) && 
            !task.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Completion filtering
      if (completionFilter !== 'all') {
        const isCompleted = task.status === 'completed';
        if (completionFilter === 'completed' && !isCompleted) return false;
        // 'in_progress' means not completed (includes 'todo', 'in_progress', etc.)
        if (completionFilter === 'in_progress' && isCompleted) return false;
        if (completionFilter === 'overdue' && (isCompleted || !task.dueDate || new Date(task.dueDate) >= currentDate)) return false;
      }

      // Due date filtering
      if (dueDateFilter !== 'all' && task.dueDate) {
        const dateRange = getDateRangeForFilter(dueDateFilter);
        if (dateRange) {
          const taskDueDate = new Date(task.dueDate);
          if (taskDueDate < dateRange.start || taskDueDate > dateRange.end) return false;
        }
      } else if (dueDateFilter !== 'all' && !task.dueDate) {
        return false;
      }

      // Filter out template tasks - only show project tasks or assigned standalone tasks
      if (task.projectId) return true; // Real project task
      
      // For tasks without projects, only show if they have assignments
      const hasDirectAssignment = task.assignedTo && (Array.isArray(task.assignedTo) ? task.assignedTo.length > 0 : !!task.assignedTo);
      const hasRoleAssignment = task.assignedToRole && (Array.isArray(task.assignedToRole) ? task.assignedToRole.length > 0 : !!task.assignedToRole);
      

      
      return hasDirectAssignment || hasRoleAssignment;
    });

    // Sort only if needed
    if (!sortConfig.key) return filtered;
    
    return filtered.sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let result = 0;
    
    switch (sortConfig.key) {
      case "priority":
        // Use userPriority if available (for My Tasks view), otherwise use default priority
        const aPriority: number = (taskFilter === 'my_tasks' && 'userPriority' in a && a.userPriority !== null) 
          ? Number(a.userPriority) 
          : (a.priority || 50);
        const bPriority: number = (taskFilter === 'my_tasks' && 'userPriority' in b && b.userPriority !== null) 
          ? Number(b.userPriority) 
          : (b.priority || 50);
        result = aPriority - bPriority; // Sort 1-50, with null/undefined treated as 50
        break;
      case "dueDate":
        if (!a.dueDate && !b.dueDate) result = 0;
        else if (!a.dueDate) result = 1;
        else if (!b.dueDate) result = -1;
        else result = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case "title":
        result = a.title.localeCompare(b.title);
        break;
      case "assignee":
        const getAssigneeName = (taskId: number) => {
          const task = tasks?.find(t => t.id === taskId);
          if (!task?.assignedTo || !contacts) return 'Unassigned';
          
          // Handle array assignments - get first assignee for sorting
          let assigneeId;
          if (Array.isArray(task.assignedTo)) {
            assigneeId = task.assignedTo[0]; // Use first assignee for sorting
          } else {
            assigneeId = task.assignedTo;
          }
          
          if (!assigneeId) return 'Unassigned';
          const assignee = contacts?.find((c: Contact) => c.id === assigneeId);
          return assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned';
        };
        result = getAssigneeName(a.id).localeCompare(getAssigneeName(b.id));
        break;
      case "familyName":
        const aFamilyName = getTaskFamilyName(a);
        const bFamilyName = getTaskFamilyName(b);
        result = aFamilyName.localeCompare(bFamilyName);
        break;
      default:
        result = 0;
    }
    
    // Apply sort direction
    return sortConfig.direction === 'desc' ? -result : result;
    });
  }, [tasks, searchQuery, completionFilter, dueDateFilter, taskFilter, sortConfig, customStartDate, customEndDate, contacts, currentUserContactId]);

  // Calculate progress for tasks assigned to current user only, considering due date filter
  const getCurrentUserTaskProgress = () => {
    if (!tasks || !currentUserContactId) return { completed: 0, total: 0, percentage: 0 };
    
    // Filter tasks by current user assignment
    let myTasks = tasks.filter(task => isUserAssignedToTask(task));
    
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
    queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
  };

  const handleSort = (key: 'priority' | 'dueDate' | 'title' | 'assignee' | 'familyName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: 'priority' | 'dueDate' | 'title' | 'assignee' | 'familyName') => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 ml-1" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1" /> : 
      <ArrowDown className="w-3 h-3 ml-1" />;
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
                className="data-[state=on]:bg-[#dbeafe] data-[state=on]:text-[#1e40af] text-[#344256]"
              >
                All
              </Toggle>
              <Toggle
                pressed={completionFilter === 'overdue'}
                onPressedChange={() => setCompletionFilter('overdue')}
                variant="outline"
                className="data-[state=on]:bg-red-100 data-[state=on]:text-red-800"
              >
                Overdue
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
                  projectId={editingTask.projectId ?? undefined} 
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
                        <OptimisticTaskToggle 
                          task={task} 
                          projectId={task.projectId} 
                          size="md"
                          className="mt-0.5"
                        />
                        {/* Show user priority input for My Tasks, regular badge for All Tasks */}
                        {taskFilter === 'my_tasks' ? (
                          <UserPriorityInput 
                            taskId={task.id} 
                            currentPriority={('userPriority' in task && task.userPriority !== null) ? task.userPriority : undefined}
                            taskFilter={taskFilter}
                          />
                        ) : (
                          <Badge className={getPriorityColor(task.priority || 25)}>
                            {task.priority || 25}
                          </Badge>
                        )}
                        <button 
                          onClick={() => handleTaskClick(task)}
                          className="flex-1 text-left"
                        >
                          <CardTitle className="text-lg hover:text-blue-600 cursor-pointer transition-colors task-title">
                            {task.title}
                          </CardTitle>
                        </button>
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
                    
                    {getTaskAssignedMembers(task).length > 0 && (
                      <div className="flex flex-col space-y-2">
                        {getTaskAssignedMembers(task).length === 1 ? (
                          // Single assignment - show directly
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>Assigned to:</span>
                            <Badge variant="secondary" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {getTaskAssignedMembers(task)[0].firstName} {getTaskAssignedMembers(task)[0].lastName}
                            </Badge>
                          </div>
                        ) : (
                          // Multiple assignments - collapsible
                          <>
                            <div 
                              className="flex items-center justify-between cursor-pointer text-sm text-gray-600"
                              onClick={() => toggleAssignmentExpansion(task.id)}
                            >
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span>Assigned to ({getTaskAssignedMembers(task).length}):</span>
                              </div>
                              {expandedAssignments.has(task.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                            {expandedAssignments.has(task.id) && (
                              <div className="flex flex-wrap gap-1 ml-6">
                                {getTaskAssignedMembers(task).map(member => (
                                  <Badge key={member.id} variant="secondary" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {member.firstName} {member.lastName}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className="flex items-center space-x-2">
                        <Badge {...getDueDateBadgeProps(task.dueDate, task.status === 'completed')} className="text-xs">
                          <CalendarDays className="w-3 h-3 mr-1" />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </Badge>
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
            <div className="space-y-4">
              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-lg border">
                <div className="col-span-1 text-xs font-medium text-gray-600">Status</div>
                <div className="col-span-1 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('priority')}
                    className={`text-xs font-medium p-1 h-auto ${sortConfig.key === 'priority' ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    Priority {getSortIcon('priority')}
                  </Button>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('familyName')}
                    className={`text-xs font-medium p-1 h-auto ${sortConfig.key === 'familyName' ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    Family Name {getSortIcon('familyName')}
                  </Button>
                </div>
                <div className="col-span-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('title')}
                    className={`text-xs font-medium p-1 h-auto ${sortConfig.key === 'title' ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    Title {getSortIcon('title')}
                  </Button>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('assignee')}
                    className={`text-xs font-medium p-1 h-auto ${sortConfig.key === 'assignee' ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    Assignee {getSortIcon('assignee')}
                  </Button>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('dueDate')}
                    className={`text-xs font-medium p-1 h-auto ${sortConfig.key === 'dueDate' ? 'text-blue-600' : 'text-gray-600'}`}
                  >
                    Due Date {getSortIcon('dueDate')}
                  </Button>
                </div>
                <div className="col-span-1 text-xs font-medium text-gray-600 text-center">Actions</div>
              </div>
              
              {/* Task Rows */}
              {filteredAndSortedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Status Column */}
                      <div className="col-span-1 flex justify-center">
                        <OptimisticTaskToggle 
                          task={task} 
                          projectId={task.projectId} 
                          size="md"
                        />
                      </div>
                      
                      {/* Priority Column */}
                      <div className="col-span-1 flex justify-center">
                        {taskFilter === 'my_tasks' ? (
                          <UserPriorityInput 
                            taskId={task.id} 
                            currentPriority={('userPriority' in task && task.userPriority !== null) ? task.userPriority : null}
                            taskFilter={taskFilter}
                          />
                        ) : (
                          <Badge className={getPriorityColor(task.priority || 25)}>
                            {task.priority || 25}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Family Name Column */}
                      <div className="col-span-2">
                        {getTaskFamilyName(task) ? (
                          <span className="text-xs text-gray-900 font-medium">
                            {getTaskFamilyName(task)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No Client
                          </span>
                        )}
                      </div>
                      
                      {/* Title Column */}
                      <div className="col-span-3">
                        <button 
                          onClick={() => handleTaskClick(task)}
                          className="text-left w-full"
                        >
                          <span className="font-medium hover:text-blue-600 cursor-pointer transition-colors task-title text-xs">
                            {task.title}
                          </span>
                        </button>
                      </div>
                      
                      {/* Assignee Column */}
                      <div className="col-span-2">
                        {getTaskAssignedMembers(task).length > 0 && (
                          <div className="flex flex-col">
                            {getTaskAssignedMembers(task).length === 1 ? (
                              // Single assignment - show directly
                              <Badge variant="secondary" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {getTaskAssignedMembers(task)[0].firstName} {getTaskAssignedMembers(task)[0].lastName}
                              </Badge>
                            ) : (
                              // Multiple assignments - collapsible
                              <>
                                <div 
                                  className="flex items-center gap-1 cursor-pointer text-xs text-gray-600"
                                  onClick={() => toggleAssignmentExpansion(task.id)}
                                >
                                  <span>Assigned ({getTaskAssignedMembers(task).length})</span>
                                  {expandedAssignments.has(task.id) ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                                {expandedAssignments.has(task.id) && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {getTaskAssignedMembers(task).map(member => (
                                      <Badge key={member.id} variant="secondary" className="text-xs">
                                        <User className="h-3 w-3 mr-1" />
                                        {member.firstName} {member.lastName}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Due Date Column */}
                      <div className="col-span-2">
                        {task.dueDate && (
                          <Badge {...getDueDateBadgeProps(task.dueDate, task.status === 'completed')} className="text-xs">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Actions Column */}
                      <div className="col-span-1 flex gap-1 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          disabled={deleteTaskMutation.isPending}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        task={selectedTask}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        projectId={selectedTask?.projectId}
        onTaskUpdate={handleTaskUpdate}
        onTaskClick={handleTaskClick}
      />
    </>
  );
}
