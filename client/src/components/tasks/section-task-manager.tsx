import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Edit3, Trash2, CheckCircle, Circle, CalendarDays, ChevronRight, ChevronDown, User } from "lucide-react";
import { OptimisticTaskToggle } from "./optimistic-task-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getDueDateBadgeProps } from "@/lib/dueDateUtils";
import type { Task, Contact } from "@shared/schema";

interface SectionTaskManagerProps {
  projectId: number;
  onTaskClick?: (task: Task) => void;
}

interface TaskSection {
  id: string;
  title: string;
  tasks: TaskNode[];
}

interface TaskNode extends Task {
  children?: TaskNode[];
  expanded?: boolean;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  parentTaskId: number | null;
  sectionId: string;
}

interface SectionFormData {
  title: string;
}

interface EditingSectionState {
  id: string;
  title: string;
}

export function SectionTaskManager({ projectId, onTaskClick }: SectionTaskManagerProps) {

  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Form states
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: "",
    parentTaskId: null,
    sectionId: "",
  });
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    title: "",
  });
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSectionState | null>(null);
  // Initialize expanded state from localStorage
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(() => {
    const stored = localStorage.getItem(`expandedTasks-${projectId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(`expandedSections-${projectId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set(); // Start with all sections collapsed
  });

  // Save expanded state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`expandedTasks-${projectId}`, JSON.stringify(Array.from(expandedTasks)));
  }, [expandedTasks, projectId]);

  useEffect(() => {
    localStorage.setItem(`expandedSections-${projectId}`, JSON.stringify(Array.from(expandedSections)));
  }, [expandedSections, projectId]);

  // Fetch milestones for this project
  const { data: milestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['/api/milestones', projectId, 'milestone-order-fix-v2'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/milestones?projectId=${projectId}`);
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch milestones:', error);
        return [];
      }
    },
    enabled: !!projectId,
  });

  // Fetch tasks and organize by sections
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['/api/projects', projectId, 'tasks', 'hierarchy-fix-v17'], // Force fresh data
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return [];
      }
    },
    enabled: !!projectId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Compute sections dynamically instead of using state
  const sections: TaskSection[] = milestones.map((milestone: any) => ({
    id: `milestone-${milestone.id}`,
    title: milestone.title,
    tasks: tasks.filter(task => task.milestoneId === milestone.id)
  }));

  // Fetch team members
  const { data: contacts = [], error: contactsError } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contacts');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const teamMembers = contacts.filter(contact => 
    contact && 
    contact.contactType === 'team_member' && 
    contact.status === 'active'
  );

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      const response = await apiRequest('POST', '/api/tasks', {
        ...taskData,
        projectId,
        level: taskData.parentTaskId ? 
          (tasks.find(t => t.id === taskData.parentTaskId)?.level || 0) + 1 : 1,
      });
      const newTask = await response.json();
      return newTask;
    },
    onSuccess: (newTask) => {
      // Optimistically update project tasks cache
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
        return oldTasks ? [...oldTasks, newTask] : [newTask];
      });
      
      // Optimistically update global tasks cache
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        return oldTasks ? [...oldTasks, newTask] : [newTask];
      });
      
      setIsTaskDialogOpen(false);
      resetTaskForm();
    },
    onError: () => {
      // Handle error silently or add proper error handling
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskData.id}`, taskData);
      const updatedTask = await response.json();
      return updatedTask;
    },
    onSuccess: (updatedTask) => {
      // Immediate cache invalidation for maximum responsiveness  
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });

      setIsTaskDialogOpen(false);
      resetTaskForm();
    },
    onError: () => {
      // On error, revert optimistic updates
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => 
      apiRequest('DELETE', `/api/tasks/${taskId}`),
    onSuccess: (_, taskId) => {
      // Optimistically remove from project tasks cache
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.filter(task => task.id !== taskId);
      });
      
      // Optimistically remove from global tasks cache
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.filter(task => task.id !== taskId);
      });

      setDeleteTaskId(null);
    },
    onError: () => {
      // On error, revert by refreshing the cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Toggle task completion
  const toggleTaskCompletion = useMutation({
    mutationFn: async (task: Task) => {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      
      // Optimistically update the cache immediately for instant UI feedback
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      });
      
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      });
      
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: newStatus,
      });
      const updatedTask = await response.json();
      return { updatedTask, originalTask: task };
    },
    onSuccess: ({ updatedTask }) => {
      // Update cache with server response for any cascading changes
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        // Find and update the specific task and any cascaded changes
        const updatedTasks = [...oldTasks];
        const taskIndex = updatedTasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex >= 0) {
          updatedTasks[taskIndex] = updatedTask;
        }
        return updatedTasks;
      });
      
      // Only invalidate tasks query for cascading updates, not project tasks
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Invalidate milestones only for progress bar updates (less frequent)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      }, 100);
    },
    onError: (error, task) => {
      // Revert optimistic update on error
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(t => t.id === task.id ? task : t);
      });
      
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(t => t.id === task.id ? task : t);
      });
    },
  });

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      dueDate: "",
      assignedTo: "",
      parentTaskId: null,
      sectionId: "",
    });
    setSelectedTask(null);
    setIsEditMode(false);
  };

  const openTaskDialog = (sectionId: string, parentTask?: Task) => {
    resetTaskForm();
    setTaskForm(prev => ({
      ...prev,
      sectionId,
      parentTaskId: parentTask?.id || null,
    }));
    setIsTaskDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task as TaskNode);
    
    // Find section ID from milestone
    const sectionId = task.milestoneId ? `milestone-${task.milestoneId}` : sections[0]?.id || `milestone-${milestones[0]?.id}`;
    
    // Convert assignedTo to correct format for form - fix null handling
    const assignedToValue = task.assignedTo ? `team_${task.assignedTo}` : "unassigned";
    
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : "",
      assignedTo: assignedToValue,
      parentTaskId: task.parentTaskId,
      sectionId: sectionId,
    });
    setIsEditMode(true);
    setIsTaskDialogOpen(true);
  };

  const openSectionDialog = () => {
    setSectionForm({ title: "" });
    setSelectedSection(null);
    setEditingSection(null);
    setIsSectionDialogOpen(true);
  };

  const handleSubmitTask = () => {
    // Find the milestone ID from section
    const currentSection = sections.find(s => s.id === taskForm.sectionId);
    const milestoneId = currentSection ? parseInt(currentSection.id.replace('milestone-', '')) : null;
    
    // Prepare task data with proper type conversions
    const taskData = {
      ...taskForm,
      description: taskForm.description || '', // No section prefix needed
      parentTaskId: taskForm.parentTaskId || null,
      assignedTo: taskForm.assignedTo || "", // Keep as string for server conversion
      projectId: projectId,
      milestoneId: milestoneId, // Use the actual milestone ID
      priority: 25, // Default priority (1-50 scale)
    };

    if (isEditMode && selectedTask) {
      updateTaskMutation.mutate({ ...taskData, id: selectedTask.id });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleSubmitSection = () => {
    if (sectionForm.title.trim()) {
      if (editingSection) {
        // Update existing section
        // Note: Section editing handled by milestone updates
        console.log('Section editing not implemented for computed sections');
        setEditingSection(null);

      } else {
        // Note: Section creation handled by milestone creation
        console.log('Section creation not implemented for computed sections');
      }
      setIsSectionDialogOpen(false);
      setSectionForm({ title: "" });
    }
  };

  const openEditSectionDialog = (section: TaskSection) => {
    setEditingSection({ id: section.id, title: section.title });
    setSectionForm({ title: section.title });
    setIsSectionDialogOpen(true);
  };

  const deleteSection = (sectionId: string) => {
    // Note: Section deletion handled by milestone deletion
    console.log('Section deletion not implemented for computed sections');
  };

  // Build task hierarchy for a section
  const buildTaskHierarchy = (sectionId: string): TaskNode[] => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    try {
      // Extract milestone ID from section ID (format: milestone-123)
      const milestoneId = parseInt(sectionId.replace('milestone-', ''));
      
      // Get all tasks for this milestone
      const milestoneTasks = tasks.filter(task => 
        task && task.milestoneId === milestoneId
      );
      
      // Debug logging for specific milestone
      if (milestoneId === 115) { // Preparing for DRPM
        console.log(`Building hierarchy for milestone ${milestoneId}, found ${milestoneTasks.length} tasks:`);
        console.log(milestoneTasks.map(t => `${t.id}: "${t.title}" (parent: ${t.parentTaskId})`));
        
        // Debug the specific task we're looking for
        const submitTask = milestoneTasks.find(t => t.id === 1041);
        if (submitTask) {
          console.log(`Found Submit Critical Reports task:`, submitTask);
        }
        
        // Find its children
        const childTasks = milestoneTasks.filter(t => t.parentTaskId === 1041);
        console.log(`Children of Submit Critical Reports (id 1041):`, childTasks.map(t => `${t.id}: ${t.title}`));
        
        // Also show tasks that should be children but aren't
        const shouldBeChildren = milestoneTasks.filter(t => 
          t.title.includes('Generate Database Reports') ||
          t.title.includes('Paperwork Sources') ||
          t.title.includes('Implementation Plan') ||
          t.title.includes('Financial Road Map')
        );
        console.log(`Tasks that might need parent assignment:`, shouldBeChildren.map(t => `${t.id}: ${t.title} (parent: ${t.parentTaskId})`));
      }
      
      // Create a map for quick lookup
      const taskMap = new Map<number, TaskNode>();
      milestoneTasks.forEach(task => {
        taskMap.set(task.id, {
          ...task,
          children: [],
          expanded: true, // Auto-expand all tasks to show hierarchy
        });
      });
      
      // Build hierarchy by connecting children to parents
      const rootTasks: TaskNode[] = [];
      milestoneTasks.forEach(task => {
        const taskNode = taskMap.get(task.id)!;
        
        if (task.parentTaskId) {
          // This is a child task
          const parent = taskMap.get(task.parentTaskId);
          if (parent) {
            parent.children!.push(taskNode);
            if (milestoneId === 115) {
              console.log(`Added "${task.title}" as child of "${parent.title}"`);
            }
          } else {
            // Parent not found in this milestone, treat as root
            rootTasks.push(taskNode);
            if (milestoneId === 115) {
              console.log(`Parent ${task.parentTaskId} not found for "${task.title}", treating as root`);
            }
          }
        } else {
          // This is a root task
          rootTasks.push(taskNode);
          if (milestoneId === 115) {
            console.log(`"${task.title}" is a root task`);
          }
        }
      });

      // Sort root tasks and recursively sort children
      const sortTasks = (taskList: TaskNode[]): TaskNode[] => {
        return taskList
          .sort((a, b) => {
            // For tasks with daysFromMeeting, sort by that first
            const aDays = a.daysFromMeeting;
            const bDays = b.daysFromMeeting;
            
            // If both have daysFromMeeting, sort by that, then by sortOrder
            if (aDays !== null && aDays !== undefined && bDays !== null && bDays !== undefined) {
              if (aDays !== bDays) return aDays - bDays;
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            }
            
            // If both have dueDate but no daysFromMeeting, sort by dueDate
            if (a.dueDate && b.dueDate && (!aDays && !bDays)) {
              const aDate = new Date(a.dueDate).getTime();
              const bDate = new Date(b.dueDate).getTime();
              if (aDate !== bDate) return aDate - bDate;
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            }
            
            // If only one has daysFromMeeting or dueDate, prioritize tasks with dates
            if ((aDays !== null && aDays !== undefined) || a.dueDate) return -1;
            if ((bDays !== null && bDays !== undefined) || b.dueDate) return 1;
            
            // If neither has timing info (sub-child tasks), sort alphabetically by title
            return a.title.localeCompare(b.title);
          })
          .map(task => ({
            ...task,
            children: task.children ? sortTasks(task.children) : []
          }));
      };

      const result = sortTasks(rootTasks);
      
      if (milestoneId === 115) {
        console.log(`Final hierarchy for milestone ${milestoneId}:`, result);
      }

      return result;
    } catch (error) {
      console.error('Error building task hierarchy:', error);
      return [];
    }
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };



  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

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
      case 'money_manager':
        return 'Money Manager';
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

  // Get all assigned team members and unassigned roles
  const getTaskAssignments = (taskData: any): { assignedMembers: Contact[], unassignedRoles: string[] } => {
    if (!contacts.length) return { assignedMembers: [], unassignedRoles: [] };
    
    const assignedMembers: Contact[] = [];
    const unassignedRoles: string[] = [];
    
    // Add directly assigned team members (by contact ID)
    if (taskData.assignedTo) {
      const assignedIds = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [taskData.assignedTo];
      assignedIds.forEach((contactId: any) => {
        if (contactId) {
          // Look in all active team members, including current user
          const member = contacts.find(c => 
            c.id === contactId && 
            c.contactType === 'team_member' && 
            c.status === 'active'
          );
          if (member) assignedMembers.push(member);
        }
      });
    }
    
    // Handle role assignments - these are now roles without active team members
    if (taskData.assignedToRole) {
      const assignedRoles = Array.isArray(taskData.assignedToRole) ? taskData.assignedToRole : [taskData.assignedToRole];
      assignedRoles.forEach((role: any) => {
        if (role) {
          // Check if there are active team members for this role
          const roleMembers = contacts.filter(c => 
            c.contactType === 'team_member' && 
            c.role === role && 
            c.status === 'active'
          );
          
          if (roleMembers.length > 0) {
            // Found active team members for this role
            roleMembers.forEach(member => {
              // Only add if not already in the list (avoid duplicates)
              if (!assignedMembers.find(am => am.id === member.id)) {
                assignedMembers.push(member);
              }
            });
          } else {
            // No active team members for this role, add to unassigned roles
            unassignedRoles.push(role);
          }
        }
      });
    }
    
    return { assignedMembers, unassignedRoles };
  };

  // Legacy function for backward compatibility
  const getTaskAssignedMembers = (taskData: any): Contact[] => {
    return getTaskAssignments(taskData).assignedMembers;
  };

  const renderTaskNode = (task: TaskNode, level: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const { assignedMembers, unassignedRoles } = getTaskAssignments(task);
    const isCompleted = task.status === 'completed';
    
    return (
      <div key={task.id} className="space-y-2">
        <div 
          className="flex items-center gap-2 task-compact rounded-lg border bg-white border-gray-200 pt-[0px] pb-[0px]"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <OptimisticTaskToggle 
            task={task} 
            projectId={projectId} 
            size="sm"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent text-left hover:text-blue-600 transition-colors task-title p-0 h-auto justify-start pl-[6px] pr-[6px] text-[12px] ${
                  isCompleted ? 'line-through text-green-600' : ''
                }`}
                onClick={() => {
                  console.log('=== TASK CLICK DETECTED ===');
                  console.log('Task clicked:', task.id, task.title);
                  console.log('onTaskClick exists:', !!onTaskClick);
                  
                  // If callback exists (project page), open sidebar only - no navigation
                  if (onTaskClick) {
                    console.log('Opening sidebar via onTaskClick callback (staying on project page)');
                    onTaskClick(task);
                  } else {
                    // If no callback, navigate to task detail page
                    console.log('No callback - navigating to task detail page');
                    setLocation(`/task/${task.id}`);
                    console.log('setLocation called');
                  }
                  
                  console.log('=== END TASK CLICK ===');
                }}
              >
                {task.title}
              </Button>
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-2"
                  onClick={() => toggleTaskExpansion(task.id)}
                >
                  {expandedTasks.has(task.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              {(task.title === "Nominations and Deliverables Checkpoints" || 
                task.title === "Submit Critical Reports and Final Highest Priority Conversation Topic" ||
                task.title === "Generate Database Reports and Documents for Preliminary Packet" ||
                (task.parentTaskId && tasks?.find((parent: any) => 
                  parent.id === task.parentTaskId && 
                  (parent.title === "Nominations and Deliverables Checkpoints" ||
                   parent.title === "Submit Critical Reports and Final Highest Priority Conversation Topic" ||
                   parent.title === "Generate Database Reports and Documents for Preliminary Packet")
                ))) && (() => {
                  // Calculate progress for this specific task and its children
                  const relevantTasks = task.children || [];
                  const completedTasks = relevantTasks.filter((t: any) => t.status === 'completed').length;
                  const totalTasks = relevantTasks.length;
                  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  
                  return (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{completedTasks}/{totalTasks}</span>
                    </div>
                  );
                })()}
              {task.dueDate && (
                <Badge {...getDueDateBadgeProps(task.dueDate, task.status === 'completed')} className="text-xs">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {format(new Date(task.dueDate), 'MMM d')}
                </Badge>
              )}
              {assignedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {assignedMembers.map(member => (
                    <Badge key={member.id} variant="secondary" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      {member.firstName} {member.lastName}
                    </Badge>
                  ))}
                </div>
              )}
              {unassignedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {unassignedRoles.map(role => (
                    <Badge key={role} className="text-xs bg-red-100 text-red-800 border-red-200">
                      <User className="h-3 w-3 mr-1" />
                      {formatRole(role)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openTaskDialog(task.milestoneId?.toString() || "section-1", task)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openEditDialog(task)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600"
              onClick={() => setDeleteTaskId(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && task.children && expandedTasks.has(task.id) && (
          <div className="space-y-0.5">
            {task.children.map(child => renderTaskNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTasks) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-[16px] font-bold">Project Tasks</h2>
        <Button onClick={openSectionDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>
      <div className="space-y-1">
        {sections.map(section => {
          const sectionTasks = buildTaskHierarchy(section.id);
          
          // Calculate task counts including all subtasks
          const getAllTasks = (tasks: TaskNode[]): TaskNode[] => {
            const allTasks: TaskNode[] = [];
            tasks.forEach(task => {
              allTasks.push(task);
              if (task.children && task.children.length > 0) {
                allTasks.push(...getAllTasks(task.children));
              }
            });
            return allTasks;
          };
          
          const allSectionTasks = getAllTasks(sectionTasks);
          const totalTasks = allSectionTasks.length;
          const completedTasks = allSectionTasks.filter(task => task.status === 'completed').length;
          const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const isSectionExpanded = expandedSections.has(section.id);
          
          return (
            <Card key={section.id}>
              <Collapsible open={isSectionExpanded} onOpenChange={() => toggleSection(section.id)}>
                <CardHeader className="pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
                  <div className="flex justify-between items-center">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 flex-1 p-2 rounded">
                        <div className="h-6 w-6 flex items-center justify-center">
                          {isSectionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <CardTitle className="font-semibold tracking-tight section-title text-[14px]">{section.title}</CardTitle>
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {completedTasks}/{totalTasks} ({progressPercentage}%)
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditSectionDialog(section)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteSection(section.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openTaskDialog(section.id)}
                        className="pl-[6px] pr-[6px] ml-[5px] mr-[5px]"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {sectionTasks.length === 0 && section.title !== "Actions & Service Since Last Progress Meeting" ? (
                      <div className="text-center py-8 text-gray-500">
                        No tasks in this section yet
                      </div>
                    ) : sectionTasks.length > 0 ? (
                      <div className="space-y-0.5">
                        {sectionTasks.map(task => renderTaskNode(task))}
                      </div>
                    ) : null}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="task-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
          </DialogHeader>
          <div id="task-dialog-description" className="sr-only">
            {isEditMode ? 'Edit the task details below' : 'Fill in the task details below'}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Assigned To</label>
              <Select
                value={taskForm.assignedTo}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {user && (
                    <SelectItem value={`me_${user.id}`}>
                      Assign to Me ({user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email})
                    </SelectItem>
                  )}
                  {teamMembers.filter(member => 
                    member.personalEmail !== user?.email && 
                    member.workEmail !== user?.email
                  ).length > 0 ? (
                    teamMembers.filter(member => 
                      member.personalEmail !== user?.email && 
                      member.workEmail !== user?.email
                    ).map(member => (
                      <SelectItem key={member.id} value={`team_${member.id}`}>
                        {member.firstName} {member.lastName || ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No other team members available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitTask}
                disabled={!taskForm.title.trim() || createTaskMutation.isPending || updateTaskMutation.isPending}
                className="flex-1"
              >
                {isEditMode ? 'Update Task' : 'Create Task'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsTaskDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="section-dialog-description">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add New Section"}</DialogTitle>
          </DialogHeader>
          <div id="section-dialog-description" className="sr-only">
            {editingSection ? 'Edit the section title below' : 'Enter a title for the new section'}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Section Title</label>
              <Input
                value={sectionForm.title}
                onChange={(e) => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter section title"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitSection}
                disabled={!sectionForm.title.trim()}
                className="flex-1"
              >
                {editingSection ? "Update Section" : "Create Section"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsSectionDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={deleteTaskId !== null} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}