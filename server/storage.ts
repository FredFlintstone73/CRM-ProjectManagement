import {
  users,
  contacts,
  projects,
  tasks,
  milestones,
  taskComments,
  taskFiles,
  projectTemplates,
  emailInteractions,
  emailNotifications,
  callTranscripts,
  activityLog,
  projectComments,
  contactNotes,
  contactFiles,
  contactBusinesses,
  userTaskPriorities,
  userInvitations,
  userActivities,
  mentions,
  calendarConnections,
  type User,
  type UpsertUser,
  type Contact,
  type InsertContact,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type Milestone,
  type InsertMilestone,
  type TaskComment,
  type InsertTaskComment,
  type TaskFile,
  type InsertTaskFile,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type EmailInteraction,
  type InsertEmailInteraction,
  type CallTranscript,
  type InsertCallTranscript,
  type ActivityLog,
  type InsertActivityLog,
  type ProjectComment,
  type InsertProjectComment,
  type ContactNote,
  type InsertContactNote,
  type ContactFile,
  type InsertContactFile,
  type ContactBusiness,
  type InsertContactBusiness,
  type UserTaskPriority,
  type InsertUserTaskPriority,
  type UserInvitation,
  type InsertUserInvitation,
  type UserActivity,
  type InsertUserActivity,
  type Mention,
  type InsertMention,
  type CalendarConnection,
  type InsertCalendarConnection,
  type EmailNotification,
  type InsertEmailNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, not, ilike, count, isNotNull, isNull, inArray, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  ensureUserHasContact(user: User): Promise<Contact>;
  getUserContactId(user: User): Promise<number | null>;

  // User invitation operations
  createUserInvitation(invitation: InsertUserInvitation & { invitedBy: string, expiresAt?: Date }): Promise<UserInvitation>;
  getUserInvitation(invitationCode: string): Promise<UserInvitation | undefined>;
  getUserInvitations(invitedBy?: string): Promise<UserInvitation[]>;
  acceptUserInvitation(invitationCode: string, userId: string): Promise<UserInvitation>;
  expireInvitation(invitationCode: string): Promise<void>;
  deleteUserInvitation(invitationId: number, userId: string): Promise<boolean>;

  // User access control operations  
  getUserAccessLevel(userId: string): Promise<string | undefined>;
  updateUserAccessLevel(userId: string, accessLevel: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  // Contact operations
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact, userId: string): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
  searchContacts(query: string): Promise<Contact[]>;
  getContactsByType(type: string): Promise<Contact[]>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject, userId: string): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  getProjectsByClient(clientId: number): Promise<Project[]>;

  // Task operations
  getTasks(): Promise<Task[]>;
  getTasksWithAccessControl(userId: string, userAccessLevel: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask, userId: string): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getUpcomingTasks(): Promise<Task[]>;
  getOverdueTasks(): Promise<Task[]>;
  getTasksByMilestone(milestoneId: number): Promise<Task[]>;
  getTaskHierarchy(projectId: number): Promise<Task[]>;
  getSubtasks(parentTaskId: number): Promise<Task[]>;

  // Milestone operations
  getMilestones(): Promise<Milestone[]>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone, userId: string): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  getMilestonesByTemplate(templateId: number): Promise<Milestone[]>;
  reorderMilestones(milestoneIds: number[]): Promise<void>;

  // Task comment operations
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment, userId: string): Promise<TaskComment>;
  updateTaskComment(commentId: number, updates: Partial<InsertTaskComment>): Promise<TaskComment>;
  deleteTaskComment(commentId: number): Promise<void>;

  // Task file operations
  getTaskFiles(taskId: number): Promise<TaskFile[]>;
  createTaskFile(file: InsertTaskFile, userId: string): Promise<TaskFile>;
  updateTaskFile(fileId: number, updates: Partial<InsertTaskFile>): Promise<TaskFile>;
  deleteTaskFile(fileId: number): Promise<void>;

  // Project template operations
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getProjectTemplate(id: number): Promise<ProjectTemplate | undefined>;
  createProjectTemplate(template: InsertProjectTemplate, userId: string): Promise<ProjectTemplate>;
  updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate>;
  deleteProjectTemplate(id: number): Promise<void>;
  getTemplateTaskCount(templateId: number): Promise<number>;
  getTemplateTasksByTemplate(templateId: number): Promise<Task[]>;
  getProjectTemplateMilestones(templateId: number): Promise<Milestone[]>;
  reorderTasks(taskUpdates: Array<{ id: number; sortOrder: number; parentTaskId?: number | null }>): Promise<void>;

  // Email interaction operations
  getEmailInteractions(): Promise<EmailInteraction[]>;
  getEmailInteractionsByContact(contactId: number): Promise<EmailInteraction[]>;
  createEmailInteraction(interaction: InsertEmailInteraction, userId: string): Promise<EmailInteraction>;
  deleteEmailInteraction(emailId: number): Promise<void>;

  // Call transcript operations
  getCallTranscripts(): Promise<CallTranscript[]>;
  getCallTranscriptsByContact(contactId: number): Promise<CallTranscript[]>;
  createCallTranscript(transcript: InsertCallTranscript, userId: string): Promise<CallTranscript>;

  // Activity log operations
  getActivityLog(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalClients: number;
    activeProjects: number;
    prospects: number;
    overdueTasks: number;
  }>;

  // Project due date operations
  getProjectsDueSoon(startDate: Date, endDate: Date): Promise<(Project & { progress: number })[]>;

  // Project comment operations
  getProjectComments(projectId: number): Promise<ProjectComment[]>;
  createProjectComment(comment: InsertProjectComment, userId: string): Promise<ProjectComment>;

  // Contact note operations
  getContactNotes(contactId: number): Promise<ContactNote[]>;
  createContactNote(note: InsertContactNote, userId: string): Promise<ContactNote>;
  updateContactNote(noteId: number, updates: Partial<InsertContactNote>): Promise<ContactNote>;
  deleteContactNote(noteId: number): Promise<void>;

  // Contact file operations
  getContactFiles(contactId: number): Promise<ContactFile[]>;
  createContactFile(file: InsertContactFile, userId: string): Promise<ContactFile>;
  updateContactFile(fileId: number, updates: Partial<InsertContactFile>): Promise<ContactFile>;
  deleteContactFile(fileId: number): Promise<void>;

  // Contact business operations
  getContactBusinesses(contactId: number): Promise<ContactBusiness[]>;
  createContactBusiness(business: InsertContactBusiness): Promise<ContactBusiness>;
  updateContactBusiness(businessId: number, updates: Partial<InsertContactBusiness>): Promise<ContactBusiness>;
  deleteContactBusiness(businessId: number): Promise<void>;

  // Role-based assignment operations
  resolveRoleAssignments(projectId: number): Promise<void>;

  // User task priority operations
  getUserTaskPriority(taskId: number, userId: string): Promise<UserTaskPriority | undefined>;
  setUserTaskPriority(taskId: number, userId: string, contactId: number | null, priority: number): Promise<UserTaskPriority>;
  getUserTasksWithPriorities(userId: string): Promise<(Task & { userPriority: number | null })[]>;

  // User activity tracking operations
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(timeRange: string, actionFilter: string, userFilter: string): Promise<UserActivity[]>;
  getUserActivityStats(timeRange: string): Promise<{
    activeUsers: number;
    totalActivities: number;
    loginSessions: number;
    uniqueIPs: number;
  }>;

  // Two-factor authentication operations
  enableTwoFactorAuth(userId: string, secret: string, backupCodes: string[]): Promise<User>;
  disableTwoFactorAuth(userId: string): Promise<User>;
  updateUserBackupCodes(userId: string, backupCodes: string[]): Promise<User>;
  isTwoFactorEnabled(userId: string): Promise<boolean>;
  verifyTwoFactor(userId: string, token: string): Promise<boolean>;

  // Search operations
  searchContacts(query: string): Promise<Contact[]>;
  searchProjects(query: string): Promise<Project[]>;
  searchTasks(query: string): Promise<Task[]>;
  searchContactNotes(query: string): Promise<(ContactNote & { authorName?: string })[]>;

  // Mentions operations
  getMentionsForUser(userId: string): Promise<(Mention & { mentionedBy: { firstName: string; lastName: string; profileImageUrl?: string; }; source?: any; })[]>;
  createMention(mention: InsertMention): Promise<Mention>;
  markMentionAsRead(mentionId: number, userId: string): Promise<void>;
  processMentionsInText(text: string, sourceType: string, sourceId: number, authorId: string): Promise<void>;

  // Task due date notifications
  getTasksDueSoon(userId: string): Promise<(Task & { projectName?: string; daysUntilDue: number })[]>;
  getOverdueTasks(userId: string): Promise<(Task & { projectName?: string; daysOverdue: number })[]>;

  // Calendar operations
  getUserCalendarConnections(userId: string): Promise<CalendarConnection[]>;
  createCalendarConnection(connection: InsertCalendarConnection): Promise<CalendarConnection>;
  updateCalendarConnection(id: number, updates: Partial<CalendarConnection>): Promise<CalendarConnection>;
  deleteCalendarConnection(id: number, userId: string): Promise<void>;
  getCalendarConnection(id: number): Promise<CalendarConnection | undefined>;

  // Email notification operations
  getEmailNotifications(userId: string): Promise<any[]>;
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  markEmailNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  markAllEmailNotificationsAsRead(userId: string): Promise<void>;

    searchTaskComments(query: string): Promise<any[]>;
    searchContactBusinesses(query: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async ensureUserHasContact(user: User): Promise<Contact> {
    // Check if contact already exists
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.firstName, user.firstName),
          eq(contacts.lastName, user.lastName)
        )
      );

    if (existingContact) {
      return existingContact;
    }

    // Create contact record for user
    const contactData: InsertContact = {
      firstName: user.firstName,
      lastName: user.lastName,
      personalEmail: user.email,
      contactType: 'team_member',
      status: 'active',
      createdBy: user.id,
    };

    const [newContact] = await db
      .insert(contacts)
      .values(contactData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId: user.id,
      action: "auto_created_contact",
      entityType: "contact",
      entityId: newContact.id,
      description: `Auto-created contact record for user ${user.firstName} ${user.lastName}`,
    });

    return newContact;
  }

  async getUserContactId(user: User): Promise<number | null> {
    console.log('getUserContactId - searching for:', user.firstName, user.lastName);

    const [contact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.firstName, user.firstName),
          eq(contacts.lastName, user.lastName)
        )
      );

    console.log('getUserContactId - found contact:', contact?.id);
    return contact?.id || null;
  }

  // User invitation operations
  async createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    // Generate unique invitation code
    const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [newInvitation] = await db
      .insert(userInvitations)
      .values({
        ...invitation,
        invitationCode,
        expiresAt,
      })
      .returning();

    return newInvitation;
  }

  async getUserInvitation(invitationCode: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.invitationCode, invitationCode));

    return invitation;
  }

  async getUserInvitations(invitedBy?: string): Promise<UserInvitation[]> {
    if (invitedBy) {
      return await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.invitedBy, invitedBy))
        .orderBy(desc(userInvitations.createdAt));
    }

    return await db
      .select()
      .from(userInvitations)
      .orderBy(desc(userInvitations.createdAt));
  }

  async acceptUserInvitation(invitationCode: string, userId: string): Promise<UserInvitation> {
    const [updatedInvitation] = await db
      .update(userInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.invitationCode, invitationCode))
      .returning();

    return updatedInvitation;
  }

  async expireInvitation(invitationCode: string): Promise<void> {
    await db
      .update(userInvitations)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.invitationCode, invitationCode));
  }

  // User access control operations
  async getUserAccessLevel(userId: string): Promise<string | undefined> {
    const [user] = await db
      .select({ accessLevel: users.accessLevel })
      .from(users)
      .where(eq(users.id, userId));

    return user?.accessLevel || undefined;
  }

  async updateUserAccessLevel(userId: string, accessLevel: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        accessLevel: accessLevel as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    // First get the user to check if they exist
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    // Get the corresponding contact for this user if it exists (check both personal and work email)
    const [userContact] = await db
      .select()
      .from(contacts)
      .where(
        or(
          eq(contacts.personalEmail, user.email),
          eq(contacts.workEmail, user.email)
        )
      );

    // If there's a corresponding contact and it's a team member, delete the contact first
    if (userContact && userContact.contactType === 'team_member') {
      // Delete the corresponding contact record
      await db.delete(contacts).where(eq(contacts.id, userContact.id));
    }

    // Delete related user records
    await db.delete(userTaskPriorities).where(eq(userTaskPriorities.userId, userId));
    await db.delete(userActivities).where(eq(userActivities.userId, userId));

    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact, userId: string): Promise<Contact> {
    // Convert date strings to Date objects
    const processedContact = { ...contact } as any;

    // Handle date conversions
    const dateFields = [
      'dateOfBirth', 'dateOfDeath', 'govIdExpiration', 'spouseDateOfBirth', 
      'spouseDateOfDeath', 'spouseGovIdExpiration', 'marriageDate',
      'child1DateOfBirth', 'child1DateOfDeath', 'child2DateOfBirth', 'child2DateOfDeath',
      'child3DateOfBirth', 'child3DateOfDeath', 'child4DateOfBirth', 'child4DateOfDeath',
      'child5DateOfBirth', 'child5DateOfDeath', 'child6DateOfBirth', 'child6DateOfDeath',
      'child7DateOfBirth', 'child7DateOfDeath'
    ];

    dateFields.forEach(field => {
      if (processedContact[field] && processedContact[field].trim()) {
        processedContact[field] = new Date(processedContact[field]);
      } else {
        processedContact[field] = null;
      }
    });

    const contactData = { ...processedContact, createdBy: userId };
    const [newContact] = await db
      .insert(contacts)
      .values(contactData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "created_contact",
      entityType: "contact",
      entityId: newContact.id,
      metadata: { contactName: `${newContact.firstName} ${newContact.lastName}` },
    });

    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    // Get the original contact for comparison
    const originalContact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    const original = originalContact[0];

    // Process date fields - convert string dates to Date objects
    const processedContact = { ...contact };
    const dateFields = [
      'dateOfBirth', 'dateOfDeath', 'govIdExpiration',
      'spouseDateOfBirth', 'spouseDateOfDeath', 'spouseGovIdExpiration',
      'marriageDate',
      'child1DateOfBirth', 'child1DateOfDeath',
      'child2DateOfBirth', 'child2DateOfDeath',
      'child3DateOfBirth', 'child3DateOfDeath',
      'child4DateOfBirth', 'child4DateOfDeath',
      'child5DateOfBirth', 'child5DateOfDeath',
      'child6DateOfBirth', 'child6DateOfDeath',
      'child7DateOfBirth', 'child7DateOfDeath'
    ];

    dateFields.forEach(field => {
      if (processedContact[field] && typeof processedContact[field] === 'string' && processedContact[field].trim()) {
        processedContact[field] = new Date(processedContact[field]);
      } else if (processedContact[field] === '' || processedContact[field] === null) {
        processedContact[field] = null;
      }
    });

    const [updatedContact] = await db
      .update(contacts)
      .set({ ...processedContact, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    // Check if this is a team member status change that affects task assignments
    if (original && original.contactType === 'team_member' && 
        (contact.status === 'inactive' || contact.status === 'archived') && 
        original.status === 'active') {

      console.log(`Team member ${original.firstName} ${original.lastName} (ID: ${id}) changed from active to ${contact.status}. Processing task reassignments...`);

      // Find all tasks assigned to this team member
      const assignedTasks = await db
        .select()
        .from(tasks)
        .where(sql`${id} = ANY(${tasks.assignedTo})`);

      // Convert these assignments back to role assignments if the team member had a role
      if (original.role && assignedTasks.length > 0) {
        for (const task of assignedTasks) {
          // Remove this contact from assignedTo array
          const updatedAssignedTo = Array.isArray(task.assignedTo) 
            ? task.assignedTo.filter(contactId => contactId !== id)
            : task.assignedTo === id ? null : task.assignedTo;

          // Add their role to assignedToRole array if not already present
          const currentRoles = Array.isArray(task.assignedToRole) ? task.assignedToRole : (task.assignedToRole ? [task.assignedToRole] : []);
          const updatedRoles = currentRoles.includes(original.role) ? currentRoles : [...currentRoles, original.role];

          await db
            .update(tasks)
            .set({
              assignedTo: updatedAssignedTo && Array.isArray(updatedAssignedTo) && updatedAssignedTo.length > 0 ? updatedAssignedTo : null,
              assignedToRole: updatedRoles.length > 0 ? updatedRoles : null,
              updatedAt: new Date()
            })
            .where(eq(tasks.id, task.id));

          console.log(`Task ${task.id} (${task.title}) - reassigned from contact ${id} to role ${original.role}`);
        }

        // Log activity
        await this.createActivityLog({
          userId: 'system',
          action: "reassigned_tasks_to_role",
          entityType: "contact", 
          entityId: id,
          description: `Reassigned ${assignedTasks.length} tasks from ${original.firstName} ${original.lastName} to role ${original.role} due to status change`,
        });
      }
    }

    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    try {
      // Get the contact to be deleted for role information
      const [contactToDelete] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, id))
        .limit(1);

      // Check if contact has assigned tasks
      const assignedTasks = await db
        .select()
        .from(tasks)
        .where(sql`${id} = ANY(${tasks.assignedTo})`);

      // For team members with a role, automatically reassign tasks to role instead of blocking deletion
      if (assignedTasks.length > 0 && contactToDelete?.contactType === 'team_member' && contactToDelete.role) {
        console.log(`Reassigning ${assignedTasks.length} tasks from deleted team member ${contactToDelete.firstName} ${contactToDelete.lastName} (ID: ${id}) to role ${contactToDelete.role}`);

        for (const task of assignedTasks) {
          // Remove this contact from assignedTo array
          const updatedAssignedTo = Array.isArray(task.assignedTo) 
            ? task.assignedTo.filter(contactId => contactId !== id)
            : task.assignedTo === id ? null : task.assignedTo;

          // Add their role to assignedToRole array if not already present
          const currentRoles = Array.isArray(task.assignedToRole) ? task.assignedToRole : (task.assignedToRole ? [task.assignedToRole] : []);
          const updatedRoles = currentRoles.includes(contactToDelete.role) ? currentRoles : [...currentRoles, contactToDelete.role];

          await db
            .update(tasks)
            .set({
              assignedTo: updatedAssignedTo && Array.isArray(updatedAssignedTo) && updatedAssignedTo.length > 0 ? updatedAssignedTo : null,
              assignedToRole: updatedRoles.length > 0 ? updatedRoles : null,
              updatedAt: new Date()
            })
            .where(eq(tasks.id, task.id));

          console.log(`Task ${task.id} (${task.title}) - reassigned from deleted contact ${id} to role ${contactToDelete.role}`);
        }

        // Log activity
        await this.createActivityLog({
          userId: 'system',
          action: "reassigned_tasks_on_deletion",
          entityType: "contact", 
          entityId: id,
          description: `Reassigned ${assignedTasks.length} tasks from deleted ${contactToDelete.firstName} ${contactToDelete.lastName} to role ${contactToDelete.role}`,
        });
      } else if (assignedTasks.length > 0) {
        // For non-team members or team members without roles, still block deletion
        throw new Error(`Cannot delete contact. This contact is assigned to ${assignedTasks.length} task(s). Please reassign or delete these tasks first.`);
      }

      // Check if contact has created projects
      const createdProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.clientId, id));

      if (createdProjects.length > 0) {
        throw new Error(`Cannot delete contact. This contact is associated with ${createdProjects.length} project(s). Please reassign or delete these projects first.`);
      }

      await db.delete(contacts).where(eq(contacts.id, id));
    } catch (error) {
      // If it's our custom error, re-throw it
      if (error.message.includes("Cannot delete contact")) {
        throw error;
      }
      // Handle database constraint errors
      if (error.code === '23503') {
        throw new Error(`Cannot delete contact. This contact is referenced by other records in the system. Please remove all references first.`);
      }
      throw error;
    }
  }



  async getContactsByType(type: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.contactType, type as any))
      .orderBy(desc(contacts.createdAt));
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject, userId: string): Promise<Project> {
    // Process date fields - convert string dates to Date objects
    const processedProject = { ...project };
    const dateFields = ['startDate', 'endDate', 'dueDate'];

    dateFields.forEach(field => {
      if (processedProject[field] && typeof processedProject[field] === 'string' && processedProject[field].trim()) {
        processedProject[field] = new Date(processedProject[field]);
      } else if (processedProject[field] === '') {
        processedProject[field] = null;
      }
    });

    const projectData = { ...processedProject, createdBy: userId } as any;
    const [newProject] = await db
      .insert(projects)
      .values(projectData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "created_project",
      entityType: "project",
      entityId: newProject.id,
      metadata: { projectName: newProject.name },
    });

    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    // Process date fields - convert string dates to Date objects
    const processedProject = { ...project };
    const dateFields = ['startDate', 'endDate', 'dueDate'];

    dateFields.forEach(field => {
      if (processedProject[field] && typeof processedProject[field] === 'string' && processedProject[field].trim()) {
        processedProject[field] = new Date(processedProject[field]);
      } else if (processedProject[field] === '') {
        processedProject[field] = null;
      }
    });

    const [updatedProject] = await db
      .update(projects)
      .set({ ...processedProject, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    // If project due date was updated, sync it to the CSR Meeting task
    if (processedProject.dueDate) {
      console.log(`Project ${id} due date updated to: ${processedProject.dueDate}`);
      await this.updateCSRMeetingTaskFromProject(id, processedProject.dueDate as Date);
    }

    return updatedProject;
  }

  // Helper method to update CSR Meeting task when project due date changes
  async updateCSRMeetingTaskFromProject(projectId: number, projectDueDate: Date): Promise<void> {
    console.log(`=== CSR Meeting Task Sync Started ===`);
    console.log(`Project ID: ${projectId}`);
    console.log(`New project due date: ${projectDueDate}`);

    // Find the CSR Meeting task in the project
    const csrMeetingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          sql`${tasks.title} LIKE 'CSR Meeting @%'`
        )
      );

    console.log(`Found ${csrMeetingTasks.length} CSR Meeting tasks`);

    if (csrMeetingTasks.length > 0) {
      const csrTask = csrMeetingTasks[0];
      console.log(`Updating CSR Meeting task ${csrTask.id}: "${csrTask.title}"`);

      // Update the CSR Meeting task due date to match project due date
      await db
        .update(tasks)
        .set({ 
          dueDate: projectDueDate,
          updatedAt: new Date() 
        })
        .where(eq(tasks.id, csrTask.id));

      console.log(`CSR Meeting task updated successfully`);

      // Now trigger P-Day dependency updates for all other tasks
      console.log(`Triggering P-Day dependency updates...`);
      await this.updatePDayDependentTasks(projectId, projectDueDate);
    } else {
      console.log(`No CSR Meeting task found in project ${projectId}`);
    }

    console.log(`=== CSR Meeting Task Sync Completed ===`);
  }

  async deleteProject(id: number): Promise<void> {
    // First, get all task IDs associated with the project for comprehensive cleanup
    const projectTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.projectId, id));

    // Get task IDs for cleanup
    const taskIds = projectTasks.map(task => task.id);

    if (taskIds.length > 0) {
      // Delete user task priorities
      await db.delete(userTaskPriorities).where(inArray(userTaskPriorities.taskId, taskIds));
      
      // Delete task comments
      await db.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
      
      // Delete task files
      await db.delete(taskFiles).where(inArray(taskFiles.taskId, taskIds));
    }

    // Delete project tasks
    await db.delete(tasks).where(eq(tasks.projectId, id));
    
    // Delete project comments
    await db.delete(projectComments).where(eq(projectComments.projectId, id));
    
    // Delete project milestones
    await db.delete(milestones).where(eq(milestones.projectId, id));
    
    // Finally delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Two-factor authentication methods
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.twoFactorEnabled === true;
  }

  async getTwoFactorSecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.twoFactorSecret || null;
  }

  async setTwoFactorSecret(userId: string, secret: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        twoFactorSecret: null,
        twoFactorEnabled: false,
        backupCodes: [],
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getBackupCodes(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    return user?.backupCodes || [];
  }

  async setBackupCodes(userId: string, codes: string[]): Promise<void> {
    await db
      .update(users)
      .set({ 
        backupCodes: codes,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async useBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user?.backupCodes?.includes(code)) {
      return false;
    }

    // Remove the used backup code
    const remainingCodes = user.backupCodes.filter(c => c !== code);
    await this.setBackupCodes(userId, remainingCodes);
    return true;
  }

  // User activity logging
  async createUserActivity(data: {
    userId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: any;
  }): Promise<void> {
    await db.insert(userActivities).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata,
      createdAt: new Date()
    });
  }

  async getUserActivities(userId: string, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  // Search methods
  async searchContacts(query: string): Promise<Contact[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(contacts)
      .where(
        or(
          sql`${contacts.firstName} ILIKE ${searchPattern}`,
          sql`${contacts.lastName} ILIKE ${searchPattern}`,
          sql`${contacts.nickname} ILIKE ${searchPattern}`,
          sql`${contacts.spouseFirstName} ILIKE ${searchPattern}`,
          sql`${contacts.spouseLastName} ILIKE ${searchPattern}`,
          sql`${contacts.spouseNickname} ILIKE ${searchPattern}`,
          sql`${contacts.personalEmail} ILIKE ${searchPattern}`,
          sql`${contacts.workEmail} ILIKE ${searchPattern}`,
          sql`${contacts.spousePersonalEmail} ILIKE ${searchPattern}`,
          sql`${contacts.spouseWorkEmail} ILIKE ${searchPattern}`,
          sql`${contacts.cellPhone} ILIKE ${searchPattern}`,
          sql`${contacts.workPhone} ILIKE ${searchPattern}`,
          sql`${contacts.spouseCellPhone} ILIKE ${searchPattern}`,
          sql`${contacts.spouseWorkPhone} ILIKE ${searchPattern}`,
          sql`${contacts.businessName} ILIKE ${searchPattern}`,
          sql`${contacts.businessPhone} ILIKE ${searchPattern}`,
          sql`${contacts.mailingAddressStreet1} ILIKE ${searchPattern}`,
          sql`${contacts.mailingAddressCity} ILIKE ${searchPattern}`,
          sql`${contacts.mailingAddressState} ILIKE ${searchPattern}`,
          sql`${contacts.businessAddressCity} ILIKE ${searchPattern}`,
          sql`${contacts.businessAddressState} ILIKE ${searchPattern}`
        )
      )
      .limit(50);
  }

  async searchProjects(query: string): Promise<Project[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(projects)
      .where(
        or(
          sql`${projects.name} ILIKE ${searchPattern}`,
          sql`${projects.description} ILIKE ${searchPattern}`
        )
      )
      .limit(50);
  }

  async searchTasks(query: string): Promise<Task[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(tasks)
      .where(
        or(
          sql`${tasks.title} ILIKE ${searchPattern}`,
          sql`${tasks.description} ILIKE ${searchPattern}`
        )
      )
      .limit(50);
  }

  async searchContactNotes(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(contactNotes)
      .where(sql`${contactNotes.content} ILIKE ${searchPattern}`)
      .limit(50);
  }

  async searchEmailInteractions(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(emailInteractions)
      .where(
        or(
          sql`${emailInteractions.subject} ILIKE ${searchPattern}`,
          sql`${emailInteractions.body} ILIKE ${searchPattern}`
        )
      )
      .limit(50);
  }

  async searchProjectComments(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(projectComments)
      .where(sql`${projectComments.content} ILIKE ${searchPattern}`)
      .limit(50);
  }

  async searchTaskComments(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(taskComments)
      .where(sql`${taskComments.content} ILIKE ${searchPattern}`)
      .limit(50);
  }

  async searchContactBusinesses(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    
    const searchPattern = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(contactBusinesses)
      .where(
        or(
          sql`${contactBusinesses.businessName} ILIKE ${searchPattern}`,
          sql`${contactBusinesses.businessPhone} ILIKE ${searchPattern}`,
          sql`${contactBusinesses.officeManagerName} ILIKE ${searchPattern}`
        )
      )
      .limit(50);
  }
}

// Create storage instance
export const storage = new DatabaseStorage();