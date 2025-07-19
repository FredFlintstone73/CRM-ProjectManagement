import { format } from 'date-fns';

/**
 * Get badge props for due date styling based on task urgency and completion status
 * Returns green for completed, red for overdue, yellow for today, default for future dates
 */
export const getDueDateBadgeProps = (dueDate: string | null, isCompleted?: boolean) => {
  if (!dueDate) return { variant: "outline" as const, style: {} };
  
  // Completed tasks get green background regardless of due date
  if (isCompleted) {
    return { 
      variant: "outline" as const, 
      style: { backgroundColor: "#00ac47", color: "white", borderColor: "#00ac47" } 
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);
  
  if (taskDate < today) {
    // Overdue - red background
    return { 
      variant: "outline" as const, 
      style: { backgroundColor: "#ea4335", color: "white", borderColor: "#ea4335" } 
    };
  } else if (taskDate.getTime() === today.getTime()) {
    // Due today - yellow background
    return { 
      variant: "outline" as const, 
      style: { backgroundColor: "#ffe79f", color: "#333", borderColor: "#ffe79f" } 
    };
  } else {
    // Future date - default outline
    return { variant: "outline" as const, style: {} };
  }
};