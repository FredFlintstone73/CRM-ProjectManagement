import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to get the current user's contact ID
 * This ensures that every user has a corresponding contact record for task assignments
 */
export function useCurrentUserContact() {
  const { isAuthenticated, user } = useAuth();

  const { data: userContactData, isLoading } = useQuery({
    queryKey: ['/api/auth/contact-id'],
    enabled: isAuthenticated,
  });

  const { data: contacts } = useQuery({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
  });

  const getCurrentUserContactId = (): number | null => {
    // Prefer the dedicated API endpoint result
    if (userContactData?.contactId) {
      return userContactData.contactId;
    }
    
    // Fallback to manual lookup for backwards compatibility
    if (!user || !contacts) return null;
    const userContact = contacts.find((contact: any) => 
      contact.firstName === user.firstName && contact.lastName === user.lastName
    );
    return userContact?.id || null;
  };

  const isUserAssignedToTask = (task: any): boolean => {
    const currentUserContactId = getCurrentUserContactId();
    if (!currentUserContactId) return false;

    if (!task.assignedTo) return false;

    // Handle both array and single assignments
    if (Array.isArray(task.assignedTo)) {
      return task.assignedTo.includes(currentUserContactId);
    }
    
    return task.assignedTo === currentUserContactId;
  };

  return {
    contactId: getCurrentUserContactId(),
    isLoading,
    isUserAssignedToTask,
  };
}