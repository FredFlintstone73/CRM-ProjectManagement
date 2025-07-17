import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { QuickActionSidebar } from "./quick-action-sidebar";
import type { Task, Contact } from "@shared/schema";

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Fetch user's tasks for badge count
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Get user's contact record to find their tasks
  const userContact = contacts.find(contact => 
    contact.personalEmail === user?.email || contact.workEmail === user?.email
  );

  const userTasks = allTasks.filter(task => 
    userContact && task.assignedTo === userContact.id
  );

  // Count tasks by status
  const pendingTasks = userTasks.filter(task => task.status !== 'completed');
  const overdueTasks = userTasks.filter(task => 
    task.dueDate && 
    new Date(task.dueDate) < new Date() && 
    task.status !== 'completed'
  );

  const todayTasks = userTasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate.startsWith(today) && task.status !== 'completed';
  });

  // Determine badge content and color
  const getBadgeInfo = () => {
    if (overdueTasks.length > 0) {
      return {
        count: overdueTasks.length,
        color: "bg-red-500",
        icon: AlertCircle
      };
    }
    if (todayTasks.length > 0) {
      return {
        count: todayTasks.length,
        color: "bg-orange-500",
        icon: Clock
      };
    }
    if (pendingTasks.length > 0) {
      return {
        count: pendingTasks.length,
        color: "bg-blue-500",
        icon: CheckCircle2
      };
    }
    return null;
  };

  const badgeInfo = getBadgeInfo();

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="fixed bottom-6 right-6 z-30"
            >
              <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
                  "bg-blue-500 hover:bg-blue-600 text-white",
                  "relative"
                )}
              >
                <Zap className="h-6 w-6" />
                
                {/* Badge */}
                {badgeInfo && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Badge 
                      className={cn(
                        "h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold text-white border-2 border-white",
                        badgeInfo.color
                      )}
                    >
                      {badgeInfo.count > 99 ? '99+' : badgeInfo.count}
                    </Badge>
                  </motion.div>
                )}
                
                {/* Pulse animation for urgent tasks */}
                {overdueTasks.length > 0 && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500 opacity-20"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-gray-900 text-white">
            <div className="text-sm">
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {overdueTasks.length} overdue
                </div>
              )}
              {todayTasks.length > 0 && (
                <div className="flex items-center gap-1 text-orange-400">
                  <Clock className="h-3 w-3" />
                  {todayTasks.length} due today
                </div>
              )}
              {pendingTasks.length > 0 && !overdueTasks.length && !todayTasks.length && (
                <div className="flex items-center gap-1 text-blue-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {pendingTasks.length} pending
                </div>
              )}
              {pendingTasks.length === 0 && (
                <div className="text-green-400">All caught up!</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <QuickActionSidebar 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}