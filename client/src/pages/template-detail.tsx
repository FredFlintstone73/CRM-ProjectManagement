import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Calendar,
  Clock,
  GripVertical,
} from "lucide-react";
import { Link } from "wouter";
import type { ProjectTemplate } from "@shared/schema";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TemplateDetailParams {
  id: string;
}

interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  estimatedDays: number;
  daysFromMeeting: number;
  parentTaskId?: number | null;
  assignedTo?: string | null;
  comments: string;
  subtasks?: TaskTemplate[];
}

// Create hierarchical task structure using actual parentTaskId
const buildTaskHierarchy = (tasks: TaskTemplate[]) => {
  const taskMap = new Map<number, TaskTemplate>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });
  
  const rootTasks: TaskTemplate[] = [];
  
  tasks.forEach(task => {
    const currentTask = taskMap.get(task.id)!;
    
    if (task.parentTaskId === null || task.parentTaskId === undefined) {
      rootTasks.push(currentTask);
    } else {
      const parentTask = taskMap.get(task.parentTaskId);
      if (parentTask) {
        if (!parentTask.subtasks) parentTask.subtasks = [];
        parentTask.subtasks.push(currentTask);
      } else {
        rootTasks.push(currentTask);
      }
    }
  });
  
  return rootTasks;
};

// TaskDisplay component for recursive task rendering
const TaskDisplay = ({ 
  task, 
  templateId, 
  level = 0, 
  milestone, 
  editingTask, 
  setEditingTask, 
  updateTaskMutation, 
  deleteTaskMutation, 
  createTaskMutation 
}: { 
  task: TaskTemplate, 
  templateId: string | undefined, 
  level?: number,
  milestone: any,
  editingTask: number | null,
  setEditingTask: (id: number | null) => void,
  updateTaskMutation: any,
  deleteTaskMutation: any,
  createTaskMutation: any
}) => {
  const indentClass = level === 0 ? '' : level === 1 ? 'ml-6' : level === 2 ? 'ml-12' : 'ml-16';
  const bgClass = level === 0 ? 'bg-white' : level === 1 ? 'bg-gray-50 border-l-4 border-l-blue-200' : level === 2 ? 'bg-gray-25 border-l-4 border-l-green-200' : 'bg-white border-l-4 border-l-purple-200';
  
  const [editTitle, setEditTitle] = useState(task.name);
  const [editDescription, setEditDescription] = useState(task.description);
  
  const handleSaveTask = () => {
    updateTaskMutation.mutate({ taskId: task.id, title: editTitle, description: editDescription });
  };
  
  const handleCancelEdit = () => {
    setEditTitle(task.name);
    setEditDescription(task.description);
    setEditingTask(null);
  };
  
  const handleAddSubtask = () => {
    const title = prompt('Enter subtask title:');
    if (title) {
      createTaskMutation.mutate({ 
        title, 
        description: '', 
        milestoneId: milestone.id, 
        parentTaskId: task.id 
      });
    }
  };
  
  const handleDeleteTask = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };
  
  const isEditing = editingTask === task.id;
  
  return (
    <div className={`space-y-2 ${indentClass}`}>
      <div className={`border rounded-lg p-4 ${bgClass} group`}>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveTask}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{task.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {task.daysFromMeeting > 0 ? `+${task.daysFromMeeting}` : task.daysFromMeeting} days
                </Badge>
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" onClick={() => setEditingTask(task.id)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleAddSubtask}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeleteTask} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Recursively render subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="space-y-2">
          {task.subtasks.map((subtask) => (
            <TaskDisplay 
              key={subtask.id} 
              task={subtask} 
              templateId={templateId}
              level={level + 1}
              milestone={milestone}
              editingTask={editingTask}
              setEditingTask={setEditingTask}
              updateTaskMutation={updateTaskMutation}
              deleteTaskMutation={deleteTaskMutation}
              createTaskMutation={createTaskMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sortable section component
const SortableSection = ({ 
  milestone, 
  milestoneIndex, 
  milestoneTasks, 
  hierarchicalTasks, 
  openPhases, 
  togglePhase, 
  editingMilestone, 
  editingTitle, 
  setEditingTitle, 
  startEditing, 
  saveEditing, 
  cancelEditing, 
  handleAddTask, 
  handleDeleteSection, 
  editingTask, 
  setEditingTask, 
  editingTaskTitle,
  setEditingTaskTitle,
  editingTaskDescription,
  setEditingTaskDescription,
  editingTaskDueDate,
  setEditingTaskDueDate,
  editingTaskAssignedTo,
  setEditingTaskAssignedTo,
  teamMembers,
  currentUser,
  startEditingTask,
  saveEditingTask,
  cancelEditingTask,
  updateTaskMutation, 
  deleteTaskMutation, 
  createTaskMutation, 
  templateId 
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOpen = openPhases ? openPhases.includes(milestone?.id) : false;
  const taskCount = milestoneTasks.length;
  const isEditing = editingMilestone === milestone?.id;

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="overflow-hidden group"
    >
      <Collapsible open={isOpen} onOpenChange={() => togglePhase && togglePhase(milestone?.id)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditing()}
                      onClick={(e) => e.stopPropagation()}
                      className="text-lg font-medium"
                      autoFocus
                    />
                    <Button size="sm" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      saveEditing();
                    }}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      cancelEditing();
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{milestone?.title}</CardTitle>
                    {milestone?.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(milestone);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(milestone.id, milestone.title);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Section {milestoneIndex + 1}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAddTask(milestone.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
              {hierarchicalTasks.map((task: any) => (
                <div key={task.id} className="border-l-2 border-blue-200 pl-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                    <div className="flex-1">
                      {editingTask === task.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingTaskTitle}
                            onChange={(e) => setEditingTaskTitle(e.target.value)}
                            className="font-medium"
                            placeholder="Task title"
                          />
                          <Textarea
                            value={editingTaskDescription}
                            onChange={(e) => setEditingTaskDescription(e.target.value)}
                            placeholder="Task description"
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={editingTaskDueDate}
                              onChange={(e) => setEditingTaskDueDate(e.target.value)}
                              className="text-sm"
                            />
                            <Select value={editingTaskAssignedTo} onValueChange={setEditingTaskAssignedTo}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {currentUser && (
                                  <SelectItem value="me">Assign to Me</SelectItem>
                                )}
                                {teamMembers.map((member: any) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {member.firstName} {member.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEditingTask}>Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingTask}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => startEditingTask(task)} className="cursor-pointer">
                          <div className="font-medium text-gray-800">{task.title}</div>
                          <div className="flex gap-2 text-sm text-gray-500 mt-1">
                            {task.dueDate && (
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            )}
                            {task.assignedTo && (() => {
                              const assignedUser = teamMembers.find((m: any) => m.id === task.assignedTo);
                              if (assignedUser) {
                                const currentUserEmail = currentUser?.email;
                                const isCurrentUser = currentUserEmail && 
                                  (assignedUser.personalEmail === currentUserEmail || assignedUser.workEmail === currentUserEmail);
                                return (
                                  <span>Assigned to: {isCurrentUser ? 'Me' : `${assignedUser.firstName} ${assignedUser.lastName}`}</span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    {editingTask !== task.id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddTask(milestone.id, task.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Sub-task
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Sub-tasks */}
                  {task.subtasks && task.subtasks.map((subtask: any) => (
                    <div key={subtask.id} className="ml-4 border-l-2 border-green-200 pl-4 space-y-2">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                        <div className="flex-1">
                          {editingTask === subtask.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingTaskTitle}
                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                className="font-medium"
                                placeholder="Sub-task title"
                              />
                              <Textarea
                                value={editingTaskDescription}
                                onChange={(e) => setEditingTaskDescription(e.target.value)}
                                placeholder="Sub-task description"
                                rows={2}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Input
                                  type="date"
                                  value={editingTaskDueDate}
                                  onChange={(e) => setEditingTaskDueDate(e.target.value)}
                                  className="text-sm"
                                />
                                <Select value={editingTaskAssignedTo} onValueChange={setEditingTaskAssignedTo}>
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Assign to..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {currentUser && (
                                      <SelectItem value="me">Assign to Me</SelectItem>
                                    )}
                                    {teamMembers.map((member: any) => (
                                      <SelectItem key={member.id} value={member.id.toString()}>
                                        {member.firstName} {member.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditingTask}>Save</Button>
                                <Button size="sm" variant="outline" onClick={cancelEditingTask}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div onClick={() => startEditingTask(subtask)} className="cursor-pointer">
                              <div className="font-medium text-gray-700">{subtask.title}</div>
                              <div className="flex gap-2 text-sm text-gray-500 mt-1">
                                {subtask.dueDate && (
                                  <span>Due: {new Date(subtask.dueDate).toLocaleDateString()}</span>
                                )}
                                {subtask.assignedTo && (() => {
                                  const assignedUser = teamMembers.find((m: any) => m.id === subtask.assignedTo);
                                  if (assignedUser) {
                                    const currentUserEmail = currentUser?.email;
                                    const isCurrentUser = currentUserEmail && 
                                      (assignedUser.personalEmail === currentUserEmail || assignedUser.workEmail === currentUserEmail);
                                    return (
                                      <span>Assigned to: {isCurrentUser ? 'Me' : `${assignedUser.firstName} ${assignedUser.lastName}`}</span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                        {editingTask !== subtask.id && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddTask(milestone.id, subtask.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Sub-sub-task
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTaskMutation.mutate(subtask.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Sub-sub-tasks */}
                      {subtask.subtasks && subtask.subtasks.map((subsubtask: any) => (
                        <div key={subsubtask.id} className="ml-4 border-l-2 border-purple-200 pl-4">
                          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border">
                            <div className="flex-1">
                              {editingTask === subsubtask.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingTaskTitle}
                                    onChange={(e) => setEditingTaskTitle(e.target.value)}
                                    className="font-medium"
                                    placeholder="Sub-sub-task title"
                                  />
                                  <Textarea
                                    value={editingTaskDescription}
                                    onChange={(e) => setEditingTaskDescription(e.target.value)}
                                    placeholder="Sub-sub-task description"
                                    rows={2}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Input
                                      type="date"
                                      value={editingTaskDueDate}
                                      onChange={(e) => setEditingTaskDueDate(e.target.value)}
                                      className="text-sm"
                                    />
                                    <Select value={editingTaskAssignedTo} onValueChange={setEditingTaskAssignedTo}>
                                      <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Assign to..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {currentUser && (
                                          <SelectItem value="me">Assign to Me</SelectItem>
                                        )}
                                        {teamMembers.map((member: any) => (
                                          <SelectItem key={member.id} value={member.id.toString()}>
                                            {member.firstName} {member.lastName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEditingTask}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditingTask}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div onClick={() => startEditingTask(subsubtask)} className="cursor-pointer">
                                  <div className="font-medium text-gray-600">{subsubtask.title}</div>
                                  <div className="flex gap-2 text-sm text-gray-400 mt-1">
                                    {subsubtask.dueDate && (
                                      <span>Due: {new Date(subsubtask.dueDate).toLocaleDateString()}</span>
                                    )}
                                    {subsubtask.assignedTo && (() => {
                                      const assignedUser = teamMembers.find((m: any) => m.id === subsubtask.assignedTo);
                                      if (assignedUser) {
                                        const currentUserEmail = currentUser?.email;
                                        const isCurrentUser = currentUserEmail && 
                                          (assignedUser.personalEmail === currentUserEmail || assignedUser.workEmail === currentUserEmail);
                                        return (
                                          <span>Assigned to: {isCurrentUser ? 'Me' : `${assignedUser.firstName} ${assignedUser.lastName}`}</span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                            {editingTask !== subsubtask.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteTaskMutation.mutate(subsubtask.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default function TemplateDetail() {
  const { id } = useParams<TemplateDetailParams>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // State variables
  const [openPhases, setOpenPhases] = useState<number[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState<string>("");
  const [editingTaskDescription, setEditingTaskDescription] = useState<string>("");
  const [editingTaskDueDate, setEditingTaskDueDate] = useState<string>("");
  const [editingTaskAssignedTo, setEditingTaskAssignedTo] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");

  // Fetch template data
  const { data: template, isLoading: isTemplateLoading } = useQuery<ProjectTemplate>({
    queryKey: ['/api/project-templates', id],
    enabled: !!id && isAuthenticated,
  });

  // Fetch current user for "Assign to Me" option
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated,
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/contacts', 'team-members'],
    queryFn: async () => {
      console.log('Fetching contacts for team members...');
      const response = await fetch('/api/contacts', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const contacts = await response.json();
      console.log('All contacts raw:', contacts);
      console.log('All contacts details:', contacts.map(c => ({ 
        id: c.id, 
        name: `${c.firstName} ${c.lastName}`, 
        contactType: c.contactType, 
        status: c.status 
      })));
      const filtered = contacts.filter((contact: any) => contact.contactType === 'team_member' && contact.status === 'active');
      console.log('Filtered team members:', filtered.map(c => ({ 
        id: c.id, 
        name: `${c.firstName} ${c.lastName}`, 
        contactType: c.contactType, 
        status: c.status 
      })));
      return filtered;
    },
    enabled: isAuthenticated,
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: isMilestonesLoading } = useQuery({
    queryKey: ['/api/milestones', 'template', id],
    queryFn: async () => {
      const response = await fetch(`/api/milestones?templateId=${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch milestones for template ${id}`);
      }
      return await response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  // Initialize template data
  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
    }
  }, [template]);

  // Initialize open phases when milestones are loaded
  useEffect(() => {
    if (milestones.length > 0 && openPhases.length === 0) {
      setOpenPhases(milestones.map(m => m.id));
    }
  }, [milestones, openPhases.length]);

  // Toggle phase open/close
  const togglePhase = (milestoneId: number) => {
    setOpenPhases(prev => 
      prev.includes(milestoneId)
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  // Mutation for reordering milestones
  const reorderMilestonesMutation = useMutation({
    mutationFn: async (milestoneIds: number[]) => {
      console.log('Sending reorder request with IDs:', milestoneIds);
      return await apiRequest('PUT', `/api/milestones/reorder`, { milestoneIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      toast({
        title: "Success",
        description: "Sections reordered successfully",
      });
    },
    onError: (error) => {
      console.error('Error reordering milestones:', error);
      toast({
        title: "Error",
        description: "Failed to reorder sections",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating milestone
  const createMilestoneMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      return await apiRequest('POST', `/api/milestones`, { title, templateId: parseInt(id!) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { templateId: id }] });
    },
  });

  // Mutation for deleting milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      return await apiRequest('DELETE', `/api/milestones/${milestoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { templateId: id }] });
    },
  });

  // Mutation for updating milestone
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, title }: { milestoneId: number; title: string }) => {
      return await apiRequest('PUT', `/api/milestones/${milestoneId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { templateId: id }] });
      setEditingMilestone(null);
      setEditingTitle("");
    },
  });

  // Mutation for creating task
  const createTaskMutation = useMutation({
    mutationFn: async ({ title, description, milestoneId, parentTaskId }: any) => {
      return await apiRequest('POST', `/api/tasks`, { 
        title, 
        description, 
        milestoneId, 
        parentTaskId,
        templateId: parseInt(id!)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { templateId: id }] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
    },
  });

  // Mutation for updating task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, title, description, dueDate, assignedTo }: any) => {
      return await apiRequest('PUT', `/api/tasks/${taskId}`, { title, description, dueDate, assignedTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
      setEditingTask(null);
      setEditingTaskTitle("");
      setEditingTaskDescription("");
      setEditingTaskDueDate("");
      setEditingTaskAssignedTo("");
    },
  });

  // Mutation for deleting task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', { templateId: id }] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
    },
  });

  // Helper functions
  const handleAddSection = () => {
    const title = prompt('Enter section title:');
    if (title) {
      createMilestoneMutation.mutate({ title });
    }
  };

  const handleAddTask = (milestoneId: number, parentTaskId?: number) => {
    const title = prompt('Enter task title:');
    if (title) {
      createTaskMutation.mutate({ 
        title, 
        description: '', 
        milestoneId, 
        parentTaskId: parentTaskId || null 
      });
    }
  };

  const handleDeleteSection = (milestoneId: number, milestoneTitle: string) => {
    if (confirm(`Are you sure you want to delete section "${milestoneTitle}"? This will remove all tasks in this section.`)) {
      deleteMilestoneMutation.mutate(milestoneId);
    }
  };

  const startEditing = (milestone: any) => {
    setEditingMilestone(milestone.id);
    setEditingTitle(milestone.title);
  };

  const saveEditing = () => {
    if (editingMilestone && editingTitle.trim()) {
      updateMilestoneMutation.mutate({ milestoneId: editingMilestone, title: editingTitle });
    }
  };

  const cancelEditing = () => {
    setEditingMilestone(null);
    setEditingTitle("");
  };

  const startEditingTask = (task: any) => {
    setEditingTask(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskDescription(task.description || "");
    setEditingTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
    
    // Check if the assigned user is the current user
    let assignedValue = "unassigned";
    if (task.assignedTo) {
      const currentUserEmail = currentUser?.email;
      const assignedUser = teamMembers.find((member: any) => member.id === task.assignedTo);
      if (assignedUser && currentUserEmail && 
          (assignedUser.personalEmail === currentUserEmail || assignedUser.workEmail === currentUserEmail)) {
        assignedValue = "me";
      } else {
        assignedValue = task.assignedTo.toString();
      }
    }
    setEditingTaskAssignedTo(assignedValue);
  };

  const saveEditingTask = () => {
    if (editingTask && editingTaskTitle.trim()) {
      let assignedTo = null;
      if (editingTaskAssignedTo && editingTaskAssignedTo !== "unassigned") {
        if (editingTaskAssignedTo === "me") {
          assignedTo = "me";
        } else {
          assignedTo = parseInt(editingTaskAssignedTo);
        }
      }
      
      updateTaskMutation.mutate({ 
        taskId: editingTask, 
        title: editingTaskTitle, 
        description: editingTaskDescription,
        dueDate: editingTaskDueDate || null,
        assignedTo: assignedTo,
      });
    }
  };

  const cancelEditingTask = () => {
    setEditingTask(null);
    setEditingTaskTitle("");
    setEditingTaskDescription("");
    setEditingTaskDueDate("");
    setEditingTaskAssignedTo("unassigned");
  };

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = milestones.findIndex((milestone) => milestone.id === active.id);
      const newIndex = milestones.findIndex((milestone) => milestone.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedMilestones = arrayMove(milestones, oldIndex, newIndex);
        const milestoneIds = reorderedMilestones.map(m => {
          const id = parseInt(String(m.id));
          return isNaN(id) ? m.id : id;
        });
        
        console.log('Reordering milestones:', milestoneIds);
        reorderMilestonesMutation.mutate(milestoneIds);
      }
    }
  };

  // Fetch tasks for each milestone
  const taskQueries = useQuery({
    queryKey: ['template-tasks', id, milestones.map(m => m.id)],
    queryFn: async () => {
      if (!milestones || milestones.length === 0) return [];
      
      const taskPromises = milestones.map(async (milestone) => {
        const response = await fetch(`/api/milestones/${milestone.id}/tasks`, {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error(`Failed to fetch tasks for milestone ${milestone.id}`);
          return { milestoneId: milestone.id, tasks: [] };
        }
        const tasks = await response.json();
        return { milestoneId: milestone.id, tasks };
      });
      
      const results = await Promise.all(taskPromises);
      return results;
    },
    enabled: !!id && isAuthenticated && milestones.length > 0,
  });

  // Prepare data for rendering
  const tasksByMilestone = useMemo(() => {
    const map = new Map();
    
    milestones.forEach((milestone) => {
      map.set(milestone.id, { milestone, tasks: [] });
    });

    // Add tasks to their respective milestones
    if (taskQueries.data) {
      taskQueries.data.forEach(({ milestoneId, tasks }) => {
        if (map.has(milestoneId)) {
          map.get(milestoneId).tasks = tasks;
        }
      });
    }

    return map;
  }, [milestones, taskQueries.data]);

  const totalTasks = Array.from(tasksByMilestone.values()).reduce((sum, { tasks }) => sum + tasks.length, 0);
  const totalDays = Array.from(tasksByMilestone.values()).reduce((sum, { tasks }) => 
    sum + tasks.reduce((taskSum: number, task: any) => taskSum + (task.estimatedDays || 0), 0), 0
  );

  if (isLoading || isTemplateLoading || isMilestonesLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-64">Please log in to view this template.</div>;
  }

  return (
    <>
      <Header 
        title="Edit Template"
        subtitle={`${totalTasks} tasks • ${totalDays} estimated days`}
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          <div className="mb-6">
            <Link href="/templates">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Template Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Template Name</label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Template Description</label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Enter template description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <Button onClick={handleAddSection} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>

          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={milestones.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {Array.from(tasksByMilestone.entries()).map(([milestoneId, { milestone, tasks: milestoneTasks }], milestoneIndex) => {
                  const hierarchicalTasks = buildTaskHierarchy(milestoneTasks);
                  
                  return (
                    <SortableSection
                      key={milestone?.id}
                      milestone={milestone}
                      milestoneIndex={milestoneIndex}
                      milestoneTasks={milestoneTasks}
                      hierarchicalTasks={hierarchicalTasks}
                      openPhases={openPhases}
                      togglePhase={togglePhase}
                      editingMilestone={editingMilestone}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      startEditing={startEditing}
                      saveEditing={saveEditing}
                      cancelEditing={cancelEditing}
                      handleAddTask={handleAddTask}
                      handleDeleteSection={handleDeleteSection}
                      editingTask={editingTask}
                      setEditingTask={setEditingTask}
                      editingTaskTitle={editingTaskTitle}
                      setEditingTaskTitle={setEditingTaskTitle}
                      editingTaskDescription={editingTaskDescription}
                      setEditingTaskDescription={setEditingTaskDescription}
                      editingTaskDueDate={editingTaskDueDate}
                      setEditingTaskDueDate={setEditingTaskDueDate}
                      editingTaskAssignedTo={editingTaskAssignedTo}
                      setEditingTaskAssignedTo={setEditingTaskAssignedTo}
                      teamMembers={teamMembers}
                      currentUser={currentUser}
                      startEditingTask={startEditingTask}
                      saveEditingTask={saveEditingTask}
                      cancelEditingTask={cancelEditingTask}
                      updateTaskMutation={updateTaskMutation}
                      deleteTaskMutation={deleteTaskMutation}
                      createTaskMutation={createTaskMutation}
                      templateId={id}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </main>
    </>
  );
}