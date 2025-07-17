import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Calendar, Target, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { Milestone, Task } from '@shared/schema';

interface MilestoneManagerProps {
  projectId: number;
}

interface MilestoneFormData {
  title: string;
  description: string;
  dueDate: string;
  sortOrder: number;
}

export function MilestoneManager({ projectId }: MilestoneManagerProps) {
  const queryClient = useQueryClient();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState<MilestoneFormData>({
    title: '',
    description: '',
    dueDate: '',
    sortOrder: 0
  });
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch milestones
  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones'],
    queryFn: () => apiRequest('/api/milestones', { params: { projectId } }),
  });

  // Fetch tasks for progress calculation
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/projects', projectId, 'task-hierarchy'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/task-hierarchy`),
  });

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: (milestoneData: MilestoneFormData) => 
      apiRequest('/api/milestones', {
        method: 'POST',
        body: { ...milestoneData, projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      setIsMilestoneDialogOpen(false);
      resetForm();
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MilestoneFormData> }) =>
      apiRequest(`/api/milestones/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      setIsMilestoneDialogOpen(false);
      resetForm();
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => 
      apiRequest(`/api/milestones/${milestoneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
    },
  });

  const resetForm = () => {
    setMilestoneFormData({
      title: '',
      description: '',
      dueDate: '',
      sortOrder: 0
    });
    setSelectedMilestone(null);
    setIsEditMode(false);
  };

  const openMilestoneDialog = () => {
    resetForm();
    setMilestoneFormData(prev => ({ ...prev, sortOrder: milestones.length }));
    setIsMilestoneDialogOpen(true);
  };

  const openEditDialog = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setMilestoneFormData({
      title: milestone.title,
      description: milestone.description || '',
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '',
      sortOrder: milestone.sortOrder
    });
    setIsEditMode(true);
    setIsMilestoneDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedMilestone) {
      updateMilestoneMutation.mutate({ id: selectedMilestone.id, data: milestoneFormData });
    } else {
      createMilestoneMutation.mutate(milestoneFormData);
    }
  };

  const getMilestoneProgress = (milestone: Milestone) => {
    const milestoneTasks = tasks.filter(task => task.milestoneId === milestone.id);
    if (milestoneTasks.length === 0) return 0;
    
    const completedTasks = milestoneTasks.filter(task => task.status === 'completed');
    return Math.round((completedTasks.length / milestoneTasks.length) * 100);
  };

  const getMilestoneTaskCount = (milestone: Milestone) => {
    return tasks.filter(task => task.milestoneId === milestone.id).length;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return <div className="p-6">Loading milestones...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Project Milestones</h2>
        <Button onClick={openMilestoneDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      <div className="grid gap-4">
        {milestones.map(milestone => {
          const progress = getMilestoneProgress(milestone);
          const taskCount = getMilestoneTaskCount(milestone);
          const overdue = isOverdue(milestone.dueDate);
          
          return (
            <Card key={milestone.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{milestone.title}</CardTitle>
                    <Badge variant={progress === 100 ? "default" : overdue ? "destructive" : "secondary"}>
                      {progress === 100 ? "Completed" : overdue ? "Overdue" : "In Progress"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(milestone)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMilestoneMutation.mutate(milestone.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {milestone.description && (
                  <p className="text-gray-600 mb-4">{milestone.description}</p>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress: {progress}%</span>
                    <span>{taskCount} tasks</span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    {milestone.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className={overdue ? "text-red-600" : ""}>
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <span>Sort Order: {milestone.sortOrder}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
          <p className="text-gray-600 mb-4">Create your first milestone to organize your project tasks.</p>
          <Button onClick={openMilestoneDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Milestone
          </Button>
        </div>
      )}

      <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Milestone' : 'Create New Milestone'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Milestone Title</Label>
                <Input
                  id="title"
                  value={milestoneFormData.title}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={milestoneFormData.dueDate}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={milestoneFormData.description}
                onChange={(e) => setMilestoneFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={milestoneFormData.sortOrder}
                onChange={(e) => setMilestoneFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMilestoneDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}>
                {isEditMode ? 'Update Milestone' : 'Create Milestone'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}