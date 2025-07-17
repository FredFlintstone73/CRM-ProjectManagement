import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Plus, 
  X, 
  Calendar,
  Trophy,
  Zap,
  Target,
  ChevronRight,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { CelebrationParticles, Confetti } from "./celebration-particles";
import { GamificationSystem } from "./gamification-system";
import type { Task, Contact } from "@shared/schema";

interface QuickActionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TaskStats {
  completed: number;
  total: number;
  streak: number;
  todayCompleted: number;
  weekCompleted: number;
}

export function QuickActionSidebar({ isOpen, onClose }: QuickActionSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [celebrationTask, setCelebrationTask] = useState<Task | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);

  // Fetch user's tasks
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    enabled: isOpen,
  });

  // Fetch contacts for assignee names
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isOpen,
  });

  // Filter tasks for current user
  const userTasks = allTasks.filter(task => {
    if (!user) return false;
    
    // Find user's contact record
    const userContact = contacts.find(contact => 
      contact.personalEmail === user.email || contact.workEmail === user.email
    );
    
    return userContact && task.assignedTo === userContact.id;
  });

  // Get today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = userTasks.filter(task => 
    task.dueDate && task.dueDate.startsWith(today)
  );

  // Get overdue tasks
  const overdueTasks = userTasks.filter(task => 
    task.dueDate && 
    new Date(task.dueDate) < new Date() && 
    task.status !== 'completed'
  );

  // Get upcoming tasks (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingTasks = userTasks.filter(task => 
    task.dueDate && 
    new Date(task.dueDate) >= new Date() &&
    new Date(task.dueDate) <= nextWeek &&
    task.status !== 'completed'
  );

  // Calculate stats
  const stats: TaskStats = {
    completed: userTasks.filter(task => task.status === 'completed').length,
    total: userTasks.length,
    streak: calculateStreak(userTasks),
    todayCompleted: todayTasks.filter(task => task.status === 'completed').length,
    weekCompleted: userTasks.filter(task => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return task.status === 'completed' && 
             task.updatedAt && 
             new Date(task.updatedAt) >= weekAgo;
    }).length
  };

  // Task completion mutation with celebration
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        status: 'completed'
      });
    },
    onSuccess: (_, taskId) => {
      const completedTask = userTasks.find(t => t.id === taskId);
      if (completedTask) {
        setCelebrationTask(completedTask);
        setShowCelebration(true);
        setShowParticles(true);
        
        // Auto-hide celebration after 3 seconds
        setTimeout(() => {
          setShowCelebration(false);
          setCelebrationTask(null);
          setShowParticles(false);
        }, 3000);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: "Task completed! 🎉",
        description: `Great job completing "${completedTask?.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  // Calculate completion streak
  function calculateStreak(tasks: Task[]): number {
    // This is a simplified streak calculation
    // In a real app, you'd want to track daily completion patterns
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasCompletedTask = completedTasks.some(task => 
        task.updatedAt && task.updatedAt.startsWith(dateStr)
      );
      
      if (hasCompletedTask) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }

  // Handle level up
  const handleLevelUp = (level: number) => {
    setNewLevel(level);
    setShowLevelUp(true);
    setShowParticles(true);
    
    setTimeout(() => {
      setShowLevelUp(false);
      setShowParticles(false);
    }, 4000);
    
    toast({
      title: `Level Up! 🎉`,
      description: `You've reached level ${level}!`,
    });
  }

  // Get priority color
  const getPriorityColor = (priority: number) => {
    if (priority <= 10) return "bg-red-500";
    if (priority <= 25) return "bg-orange-500";
    if (priority <= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Get priority label
  const getPriorityLabel = (priority: number) => {
    if (priority <= 10) return "High";
    if (priority <= 25) return "Medium";
    if (priority <= 40) return "Low";
    return "Lowest";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-full pb-16">
              {/* Stats Cards */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Streak</div>
                        <div className="text-xl font-bold">{stats.streak}</div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
                        <div className="text-xl font-bold">{stats.todayCompleted}</div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Progress */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                  <Progress 
                    value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                    className="h-2"
                  />
                </Card>

                {/* Gamification System */}
                <GamificationSystem
                  completedTasks={stats.completed}
                  totalTasks={stats.total}
                  streak={stats.streak}
                  todayCompleted={stats.todayCompleted}
                  weekCompleted={stats.weekCompleted}
                  onLevelUp={handleLevelUp}
                />

                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                  <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-red-600 dark:text-red-400 text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Overdue ({overdueTasks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {overdueTasks.slice(0, 3).map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onComplete={completeTaskMutation.mutate}
                          isCompleting={completeTaskMutation.isPending}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Today's Tasks */}
                {todayTasks.length > 0 && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-blue-600 dark:text-blue-400 text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due Today ({todayTasks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {todayTasks.filter(t => t.status !== 'completed').slice(0, 3).map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onComplete={completeTaskMutation.mutate}
                          isCompleting={completeTaskMutation.isPending}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Tasks */}
                {upcomingTasks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        Upcoming ({upcomingTasks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {upcomingTasks.slice(0, 5).map((task) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onComplete={completeTaskMutation.mutate}
                          isCompleting={completeTaskMutation.isPending}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {userTasks.length === 0 && (
                  <Card className="p-8 text-center">
                    <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tasks assigned</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You're all caught up! Great job!
                    </p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </motion.div>

          {/* Celebration Animation */}
          <AnimatePresence>
            {showCelebration && celebrationTask && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-2xl border border-green-200 dark:border-green-800 max-w-sm mx-4"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", damping: 10 }}
                      className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4"
                    >
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </motion.div>
                    <h3 className="text-lg font-semibold mb-2">Task Completed!</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      "{celebrationTask.title}"
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                        >
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level Up Celebration */}
          <AnimatePresence>
            {showLevelUp && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-2xl border border-blue-200 dark:border-blue-800 max-w-md mx-4"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", damping: 10 }}
                      className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full mb-4"
                    >
                      <Trophy className="h-10 w-10 text-blue-500" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-2 text-blue-600 dark:text-blue-400">
                      Level Up!
                    </h3>
                    <p className="text-lg font-semibold mb-2">
                      You've reached Level {newLevel}!
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Keep up the great work! You're becoming a task master!
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.15 }}
                        >
                          <Star className="h-6 w-6 text-yellow-400 fill-current" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particle Effects */}
          <CelebrationParticles isActive={showParticles} duration={3000} />
          <Confetti isActive={showParticles} />
        </>
      )}
    </AnimatePresence>
  );
}

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: number) => void;
  isCompleting: boolean;
}

function TaskItem({ task, onComplete, isCompleting }: TaskItemProps) {
  const getPriorityColor = (priority: number) => {
    if (priority <= 10) return "bg-red-500";
    if (priority <= 25) return "bg-orange-500";
    if (priority <= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 10) return "High";
    if (priority <= 25) return "Medium";
    if (priority <= 40) return "Low";
    return "Lowest";
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onComplete(task.id)}
        disabled={isCompleting || task.status === 'completed'}
        className="h-8 w-8 p-0 shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-sm font-medium truncate",
            task.status === 'completed' && "line-through text-gray-500"
          )}>
            {task.title}
          </span>
          <div className={cn(
            "w-2 h-2 rounded-full shrink-0",
            getPriorityColor(task.priority || 25)
          )} />
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {task.dueDate && (
            <span>
              Due: {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          <Badge variant="outline" className="text-xs py-0">
            {getPriorityLabel(task.priority || 25)}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}