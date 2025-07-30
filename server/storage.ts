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
  invitationRequests,
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
  type InvitationRequest,
  type InsertInvitationRequest,
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

  // Authentication operations (username/password)
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: { username: string; password: string; email?: string; firstName?: string; lastName?: string; accessLevel?: string; isActive?: boolean; invitedBy?: string; invitedAt?: Date }): Promise<User>;

  // User invitation operations
  createUserInvitation(invitation: InsertUserInvitation & { invitedBy: string, expiresAt?: Date }): Promise<UserInvitation>;
  getUserInvitation(invitationCode: string): Promise<UserInvitation | undefined>;
  getUserInvitationByCode(invitationCode: string): Promise<UserInvitation | undefined>;
  getUserInvitations(invitedBy?: string): Promise<UserInvitation[]>;
  acceptUserInvitation(invitationCode: string, userId: string): Promise<UserInvitation>;
  updateUserInvitation(invitationId: number, updates: Partial<UserInvitation>): Promise<UserInvitation>;
  expireInvitation(invitationCode: string): Promise<void>;
  deleteUserInvitation(invitationId: number, userId: string): Promise<boolean>;

  // Auto email configuration
  configureAutoEmailSettings(userId: string, email: string): Promise<void>;

  // Invitation request operations
  createInvitationRequest(request: InsertInvitationRequest): Promise<InvitationRequest>;
  getInvitationRequests(): Promise<InvitationRequest[]>;
  updateInvitationRequestStatus(id: number, status: string, reviewedBy: string): Promise<InvitationRequest>;
  deleteInvitationRequest(id: number): Promise<boolean>;

  // User access control operations  
  getUserAccessLevel(userId: string): Promise<string | undefined>;
  updateUserAccessLevel(userId: string, accessLevel: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsers(): Promise<User[]>; // Alias for getAllUsers
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getUserById(userId: string): Promise<User | null>;
  updateUser(userId: string, updates: Partial<any>): Promise<User | null>;

  // Two-Factor Authentication operations
  enable2FA(userId: string, secret: string, backupCodes: any[]): Promise<User>;
  disable2FA(userId: string): Promise<User>;
  update2FABackupCodes(userId: string, backupCodes: any[]): Promise<User>;
  get2FAStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }>;

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

  // Authentication operations (username/password)
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token));

    return user;
  }

  async createUser(userData: { 
    username: string; 
    password: string; 
    email?: string; 
    firstName?: string; 
    lastName?: string; 
    accessLevel?: string; 
    isActive?: boolean; 
    invitedBy?: string; 
    invitedAt?: Date 
  }): Promise<User> {
    // Generate a unique ID
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const [newUser] = await db
      .insert(users)
      .values({
        id,
        username: userData.username,
        password: userData.password,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        accessLevel: userData.accessLevel || "team_member",
        isActive: userData.isActive !== false,
        invitedBy: userData.invitedBy,
        invitedAt: userData.invitedAt,
      })
      .returning();

    return newUser;
  }

  async getUserInvitationByCode(invitationCode: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.invitationCode, invitationCode));

    return invitation;
  }

  async updateUserInvitation(invitationId: number, updates: Partial<UserInvitation>): Promise<UserInvitation> {
    const [updatedInvitation] = await db
      .update(userInvitations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userInvitations.id, invitationId))
      .returning();

    return updatedInvitation;
  }

  async configureAutoEmailSettings(userId: string, email: string): Promise<void> {
    const domain = email.split('@')[1]?.toLowerCase();
    let emailConfig: any = {};

    // Auto-configure based on common email providers
    switch (domain) {
      case 'gmail.com':
        emailConfig = {
          emailConfigured: true,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: email,
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
        };
        break;
      case 'outlook.com':
      case 'hotmail.com':
      case 'live.com':
        emailConfig = {
          emailConfigured: true,
          smtpHost: 'smtp-mail.outlook.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: email,
          imapHost: 'outlook.office365.com',
          imapPort: 993,
          imapSecure: true,
        };
        break;
      case 'yahoo.com':
        emailConfig = {
          emailConfigured: true,
          smtpHost: 'smtp.mail.yahoo.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: email,
          imapHost: 'imap.mail.yahoo.com',
          imapPort: 993,
          imapSecure: true,
        };
        break;
      default:
        // Unknown domain, don't auto-configure
        console.log(`No auto-configuration available for domain: ${domain}`);
        return;
    }

    // Update user with auto-configured email settings
    await db
      .update(users)
      .set({
        ...emailConfig,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`Auto-configured email settings for ${email} (${domain})`);
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

    // Handle contacts created by this user
    // Find the chad@alignedadvisors.com admin user to reassign everything to
    const [chadAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'chad@alignedadvisors.com'))
      .limit(1);

    if (chadAdmin) {
      // Reassign all contacts (except the user's own team member contact) to chad@alignedadvisors.com
      await db.update(contacts)
        .set({ createdBy: chadAdmin.id })
        .where(and(
          eq(contacts.createdBy, userId),
          not(eq(contacts.id, userContact?.id || -1))
        ));
    }

    // Delete the user's own team member contact record if it exists
    if (userContact && userContact.contactType === 'team_member') {
      await db.delete(contacts).where(eq(contacts.id, userContact.id));
    }

    // Delete all related user records in the correct order (child tables first)
    await db.delete(contactNotes).where(eq(contactNotes.userId, userId));
    await db.delete(contactFiles).where(eq(contactFiles.userId, userId));
    
    // Reassign other database records to chad@alignedadvisors.com if available
    if (chadAdmin) {
      await db.update(projects).set({ createdBy: chadAdmin.id }).where(eq(projects.createdBy, userId));
      await db.update(tasks).set({ createdBy: chadAdmin.id }).where(eq(tasks.createdBy, userId));
      await db.update(projectTemplates).set({ createdBy: chadAdmin.id }).where(eq(projectTemplates.createdBy, userId));
    }
    
    // Handle email interactions with self-referencing foreign keys
    // First get all email interaction IDs created by this user
    const userEmailInteractions = await db
      .select({ id: emailInteractions.id })
      .from(emailInteractions)
      .where(eq(emailInteractions.createdBy, userId));
    
    const emailIds = userEmailInteractions.map(e => e.id);
    
    // Update any child emails that reference these parent emails
    if (emailIds.length > 0) {
      await db.update(emailInteractions)
        .set({ parentEmailId: null })
        .where(inArray(emailInteractions.parentEmailId, emailIds));
    }
    
    // Then delete the email interactions
    await db.delete(emailInteractions).where(eq(emailInteractions.createdBy, userId));
    
    await db.delete(projectComments).where(eq(projectComments.userId, userId));
    await db.delete(callTranscripts).where(eq(callTranscripts.createdBy, userId));
    await db.delete(userTaskPriorities).where(eq(userTaskPriorities.userId, userId));
    await db.delete(emailNotifications).where(eq(emailNotifications.userId, userId));
    await db.delete(activityLog).where(eq(activityLog.userId, userId));
    
    // Handle mentions (both as mentioned and mentioning user)
    await db.delete(mentions).where(eq(mentions.mentionedUserId, userId));
    await db.delete(mentions).where(eq(mentions.mentionedByUserId, userId));
    
    // Update invitation requests that were reviewed by this user
    await db.update(invitationRequests)
      .set({ reviewedBy: null })
      .where(eq(invitationRequests.reviewedBy, userId));
    
    // Delete user invitations that were created by this user
    await db.delete(userInvitations)
      .where(eq(userInvitations.invitedBy, userId));
    
    // Update users that were invited by this user
    await db.update(users)
      .set({ invitedBy: null })
      .where(eq(users.invitedBy, userId));
    
    // Delete calendar connections
    await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));

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

    const taskIds = projectTasks.map(task => task.id);

    // Delete all related records to avoid foreign key constraint issues

    // Delete user task priorities for all project tasks
    if (taskIds.length > 0) {
      await db.delete(userTaskPriorities).where(inArray(userTaskPriorities.taskId, taskIds));
    }

    // Delete all task comments for project tasks
    if (taskIds.length > 0) {
      await db.delete(taskComments).where(inArray(taskComments.taskId, taskIds));
    }

    // Delete all tasks associated with the project
    await db.delete(tasks).where(eq(tasks.projectId, id));

    // Delete all project comments associated with the project
    await db.delete(projectComments).where(eq(projectComments.projectId, id));

    // Delete the project itself
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId))
      .orderBy(desc(projects.createdAt));
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    // Return tasks that are either:
    // 1. Assigned to actual projects (not template tasks)
    // 2. Standalone tasks with assignments (not template tasks)
    return await db
      .select()
      .from(tasks)
      .where(
        or(
          isNotNull(tasks.projectId), // Project tasks
          and(
            isNull(tasks.projectId), // Standalone tasks
            or(
              sql`${tasks.assignedTo} IS NOT NULL AND array_length(${tasks.assignedTo}, 1) > 0`, // Has direct assignments
              sql`${tasks.assignedToRole} IS NOT NULL AND array_length(${tasks.assignedToRole}, 1) > 0` // Has role assignments
            )
          )
        )
      )
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksWithAccessControl(userId: string, userAccessLevel: string): Promise<Task[]> {
    // Administrators and Managers can see all tasks
    if (userAccessLevel === 'administrator' || userAccessLevel === 'manager') {
      return await this.getTasks();
    }

    // Team Members can only see tasks from projects where they have assigned tasks
    if (userAccessLevel === 'team_member') {
      // First, get the user's contact ID
      const userContact = await this.getUserContactId({ id: userId } as any);
      if (!userContact) {
        return []; // No contact record, no tasks visible
      }

      // Get all projects where the user has assigned tasks
      const userProjectIds = await db
        .selectDistinct({ projectId: tasks.projectId })
        .from(tasks)
        .where(
          sql`${tasks.assignedTo} @> ARRAY[${userContact}]::integer[] AND ${tasks.projectId} IS NOT NULL`
        );

      if (userProjectIds.length === 0) {
        return []; // User has no assigned tasks, no tasks visible
      }

      const projectIds = userProjectIds.map(p => p.projectId).filter(id => id !== null);

      // Return all tasks from projects where the user has assigned tasks
      return await db
        .select()
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds))
        .orderBy(desc(tasks.createdAt));
    }

    // Default: no access
    return [];
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask, userId: string): Promise<Task> {
    // Process date field - create local noon date to avoid timezone issues
    const processedTask = { ...task };
    if (processedTask.dueDate && typeof processedTask.dueDate === 'string' && processedTask.dueDate.trim()) {
      // For YYYY-MM-DD format, create date in local timezone at noon to avoid UTC conversion issues
      const dateStr = processedTask.dueDate.trim();
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Parse as local date at noon to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        processedTask.dueDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        processedTask.dueDate = new Date(processedTask.dueDate);
      }
    } else if (processedTask.dueDate === '') {
      processedTask.dueDate = null;
    }

    // Assignment processing is handled by the route layer, just pass through

    const taskData = { ...processedTask, createdBy: userId } as any;



    const [newTask] = await db
      .insert(tasks)
      .values(taskData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "created_task",
      entityType: "task",
      entityId: newTask.id,
      metadata: { taskTitle: newTask.title },
    });

    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>, userId?: string): Promise<Task> {
    // Process date field - create local midnight date to avoid timezone issues
    const processedTask = { ...task };
    if (processedTask.dueDate !== undefined) {
      if (processedTask.dueDate === '' || processedTask.dueDate === null) {
        processedTask.dueDate = null;
      } else if (typeof processedTask.dueDate === 'string') {
        // Parse YYYY-MM-DD as local date and set to noon to avoid timezone edge cases
        const dateStr = processedTask.dueDate.trim();
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-').map(Number);
          // Create date at noon local time to avoid timezone boundary issues
          processedTask.dueDate = new Date(year, month - 1, day, 12, 0, 0);
        } else {
          processedTask.dueDate = new Date(processedTask.dueDate);
        }
      }
    }

    // Handle assignment - already processed by PATCH route as clean array
    console.log('🔥 Storage updateTask - received assignedTo:', processedTask.assignedTo, 'Type:', typeof processedTask.assignedTo, 'IsArray:', Array.isArray(processedTask.assignedTo));

    if (processedTask.assignedTo !== undefined) {
      if (Array.isArray(processedTask.assignedTo)) {
        // Array is already processed by PATCH route - keep as is
        console.log('🔥 Storage - keeping array assignment as is:', processedTask.assignedTo);
        // processedTask.assignedTo is already correct - no changes needed
      } else if (processedTask.assignedTo === null || processedTask.assignedTo === '') {
        processedTask.assignedTo = null;
      }
    }



    const [updatedTask] = await db
      .update(tasks)
      .set({ ...processedTask, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    // Check if this is a CSR Meeting task (P-Day reference) and due date was updated
    if (processedTask.dueDate && updatedTask.title?.includes('CSR Meeting @')) {
      console.log(`P-Day reference task detected: ${updatedTask.title}`);
      console.log(`New due date: ${processedTask.dueDate}`);
      console.log(`Project ID: ${updatedTask.projectId}`);

      // Get the project ID and update all P-Day dependent tasks
      const projectId = updatedTask.projectId;
      if (projectId) {
        console.log(`Calling updatePDayDependentTasks for project ${projectId}`);
        await this.updatePDayDependentTasks(projectId, processedTask.dueDate as Date);
        console.log(`P-Day dependent tasks update completed`);
      }
    }

    // Handle automatic due date calculation for dependent tasks
    if (processedTask.dueDate && updatedTask.title && updatedTask.title.includes('DRPM')) {
      await this.updateDependentTasksFromDRPM(id, processedTask.dueDate);
    }

    // Handle downward cascading: if task was completed, complete all child tasks
    if (processedTask.status === 'completed' && userId) {
      await this.completeAllChildTasks(id, userId);
    }

    // Handle downward cascading: if task was uncompleted, uncomplete all child tasks
    if (processedTask.status === 'todo' && userId) {
      await this.uncompleteAllChildTasks(id, userId);
    }

    // Handle upward cascading completion: if task was completed, check if parent should auto-complete
    if (processedTask.status === 'completed' && updatedTask.parentTaskId && userId) {
      await this.checkAndCompleteParentTask(updatedTask.parentTaskId, userId);
    }

    // Handle upward cascading completion: if task was uncompleted, check if parent should auto-uncomplete
    if (processedTask.status === 'todo' && updatedTask.parentTaskId && userId) {
      await this.checkAndUncompleteparentTask(updatedTask.parentTaskId, userId);
    }

    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    // Delete related data in the correct order to avoid foreign key constraints

    // Delete user task priorities for this task
    await db.delete(userTaskPriorities).where(eq(userTaskPriorities.taskId, id));

    // Delete task comments
    await db.delete(taskComments).where(eq(taskComments.taskId, id));

    // Delete task files
    await db.delete(taskFiles).where(eq(taskFiles.taskId, id));

    // Delete the task itself
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          isNotNull(tasks.projectId), // Filter out template tasks
          eq(tasks.assignedTo, userId)
        )
      )
      .orderBy(desc(tasks.createdAt));
  }

  async getUpcomingTasks(): Promise<Task[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return await db
      .select()
      .from(tasks)
      .where(
        and(
          isNotNull(tasks.projectId), // Filter out template tasks
          eq(tasks.status, "todo"),
          sql`${tasks.dueDate} BETWEEN ${now} AND ${nextWeek}`
        )
      )
      .orderBy(tasks.dueDate);
  }

  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();

    return await db
      .select()
      .from(tasks)
      .where(
        and(
          isNotNull(tasks.projectId), // Filter out template tasks
          eq(tasks.status, "todo"),
          sql`${tasks.dueDate} < ${now}`
        )
      )
      .orderBy(tasks.dueDate);
  }

  async getTasksByMilestone(milestoneId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.milestoneId, milestoneId))
      .orderBy(tasks.sortOrder, tasks.level, tasks.createdAt);
  }

  async getTaskHierarchy(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.sortOrder, tasks.level, tasks.createdAt);
  }

  async getSubtasks(parentTaskId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId))
      .orderBy(tasks.sortOrder, tasks.createdAt);
  }

  // Milestone operations
  async getMilestones(): Promise<Milestone[]> {
    return await db.select().from(milestones).orderBy(milestones.sortOrder, desc(milestones.createdAt));
  }

  async getMilestone(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }

  async createMilestone(milestone: InsertMilestone, userId: string): Promise<Milestone> {
    // Process date field - convert string date to Date object
    const processedMilestone = { ...milestone };
    if (processedMilestone.dueDate && typeof processedMilestone.dueDate === 'string' && processedMilestone.dueDate.trim()) {
      processedMilestone.dueDate = new Date(processedMilestone.dueDate);
    } else if (processedMilestone.dueDate === '') {
      processedMilestone.dueDate = null;
    }

    // Calculate the next sort order to place the new milestone at the end
    let maxSortOrder = 0;
    if (processedMilestone.templateId) {
      const existingMilestones = await db
        .select()
        .from(milestones)
        .where(eq(milestones.templateId, processedMilestone.templateId))
        .orderBy(desc(milestones.sortOrder));

      if (existingMilestones.length > 0) {
        maxSortOrder = existingMilestones[0].sortOrder || 0;
      }
    } else if (processedMilestone.projectId) {
      const existingMilestones = await db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, processedMilestone.projectId))
        .orderBy(desc(milestones.sortOrder));

      if (existingMilestones.length > 0) {
        maxSortOrder = existingMilestones[0].sortOrder || 0;
      }
    }

    const milestoneData = { 
      ...processedMilestone, 
      createdBy: userId,
      sortOrder: maxSortOrder + 1
    } as any;

    const [newMilestone] = await db
      .insert(milestones)
      .values(milestoneData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "created_milestone",
      entityType: "milestone",
      entityId: newMilestone.id,
      metadata: { milestoneTitle: newMilestone.title },
    });

    return newMilestone;
  }

  async updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone> {
    // Process date field - convert string date to Date object
    const processedMilestone = { ...milestone };
    if (processedMilestone.dueDate && typeof processedMilestone.dueDate === 'string' && processedMilestone.dueDate.trim()) {
      processedMilestone.dueDate = new Date(processedMilestone.dueDate);
    } else if (processedMilestone.dueDate === '') {
      processedMilestone.dueDate = null;
    }

    const [updatedMilestone] = await db
      .update(milestones)
      .set({ ...processedMilestone, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteMilestone(id: number): Promise<void> {
    // First, update all tasks in this milestone to have no milestone
    await db
      .update(tasks)
      .set({ milestoneId: null })
      .where(eq(tasks.milestoneId, id));

    // Then delete the milestone
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async getMilestonesByProject(projectId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(milestones.sortOrder, desc(milestones.createdAt));
  }

  async getMilestonesByTemplate(templateId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.templateId, templateId))
      .orderBy(milestones.sortOrder, desc(milestones.createdAt));
  }

  async reorderMilestones(milestoneIds: number[]): Promise<void> {
    // Update sortOrder for each milestone based on its position in the array
    for (let i = 0; i < milestoneIds.length; i++) {
      await db
        .update(milestones)
        .set({ 
          sortOrder: i + 1,
          updatedAt: new Date()
        })
        .where(eq(milestones.id, milestoneIds[i]));
    }
  }

  // Task comment operations
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const result = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        userId: taskComments.userId,
        comment: taskComments.comment,
        createdAt: taskComments.createdAt,
        updatedAt: taskComments.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt));

    return result as any;
  }

  async createTaskComment(comment: InsertTaskComment, userId: string): Promise<TaskComment> {
    const commentData = { ...comment, userId } as any;
    const [newComment] = await db
      .insert(taskComments)
      .values(commentData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "created_task_comment",
      entityType: "task_comment",
      entityId: newComment.id,
      metadata: { taskId: newComment.taskId },
    });

    return newComment;
  }

  async updateTaskComment(commentId: number, updates: Partial<InsertTaskComment>): Promise<TaskComment> {
    const [updatedComment] = await db
      .update(taskComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taskComments.id, commentId))
      .returning();
    return updatedComment;
  }

  async deleteTaskComment(commentId: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, commentId));
  }

  // Task file operations
  async getTaskFiles(taskId: number): Promise<TaskFile[]> {
    return await db
      .select()
      .from(taskFiles)
      .where(eq(taskFiles.taskId, taskId))
      .orderBy(desc(taskFiles.createdAt));
  }

  async createTaskFile(file: InsertTaskFile, userId: string): Promise<TaskFile> {
    const fileData = { ...file, uploadedBy: userId } as any;
    const [newFile] = await db
      .insert(taskFiles)
      .values(fileData)
      .returning();

    // Log activity
    await this.createActivityLog({
      userId,
      action: "uploaded_task_file",
      entityType: "task_file",
      entityId: newFile.id,
      metadata: { taskId: newFile.taskId, fileName: newFile.originalName },
    });

    return newFile;
  }

  async updateTaskFile(fileId: number, updates: Partial<InsertTaskFile>): Promise<TaskFile> {
    const [updatedFile] = await db
      .update(taskFiles)
      .set(updates)
      .where(eq(taskFiles.id, fileId))
      .returning();
    return updatedFile;
  }

  async deleteTaskFile(fileId: number): Promise<void> {
    await db.delete(taskFiles).where(eq(taskFiles.id, fileId));
  }

  // Project template operations
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await db.select().from(projectTemplates).orderBy(desc(projectTemplates.createdAt));
  }

  async getProjectTemplate(id: number): Promise<ProjectTemplate | undefined> {
    const [template] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, id));
    return template;
  }

  async createProjectTemplate(template: InsertProjectTemplate, userId: string): Promise<ProjectTemplate> {
    const templateData = { ...template, createdBy: userId } as any;
    const [newTemplate] = await db
      .insert(projectTemplates)
      .values(templateData)
      .returning();
    return newTemplate;
  }

  async updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate> {
    const [updatedTemplate] = await db
      .update(projectTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(projectTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteProjectTemplate(id: number): Promise<void> {
    try {
      const result = await db.delete(projectTemplates).where(eq(projectTemplates.id, id));
      console.log(`Deleted project template ${id}:`, result);
    } catch (error) {
      console.error(`Error deleting project template ${id}:`, error);
      throw error;
    }
  }

  async getTemplateTaskCount(templateId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(tasks)
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(milestones.templateId, templateId));

    return result[0]?.count || 0;
  }

  async getTemplateTasksByTemplate(templateId: number): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .innerJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(milestones.templateId, templateId))
      .orderBy(tasks.createdAt);

    // Extract just the task data from the joined result
    return result.map(row => row.tasks);
  }

  async getProjectTemplateMilestones(templateId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.templateId, templateId))
      .orderBy(milestones.createdAt);
  }

  async reorderTasks(taskUpdates: Array<{ id: number; sortOrder: number; parentTaskId?: number | null }>): Promise<void> {
    // Update all task orders individually (Neon HTTP driver doesn't support transactions)
    for (const update of taskUpdates) {
      await db
        .update(tasks)
        .set({ 
          sortOrder: update.sortOrder,
          parentTaskId: update.parentTaskId,
          updatedAt: new Date() 
        })
        .where(eq(tasks.id, update.id));
    }
  }

  // Helper method to update P-Day dependent tasks when CSR Meeting date changes
  async updatePDayDependentTasks(projectId: number, pDayDate: Date): Promise<void> {
    console.log(`=== P-Day Dependency Update Started ===`);
    console.log(`Project ID: ${projectId}`);
    console.log(`P-Day reference date: ${pDayDate}`);

    // Find all tasks in the project that have daysFromMeeting values (P-Day dependent)
    const pDayTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          isNotNull(tasks.daysFromMeeting)
        )
      );

    console.log(`Found ${pDayTasks.length} P-Day dependent tasks for project ${projectId}`);

    if (pDayTasks.length === 0) {
      console.log(`No P-Day dependent tasks found - this may be an issue`);
      return;
    }

    // Update each P-Day dependent task's due date
    for (const task of pDayTasks) {
      if (task.daysFromMeeting !== null && task.daysFromMeeting !== undefined) {
        const newDueDate = new Date(pDayDate);
        // Set time to noon to avoid timezone issues
        newDueDate.setHours(12, 0, 0, 0);
        newDueDate.setDate(newDueDate.getDate() + task.daysFromMeeting);

        console.log(`Updating task ${task.id} "${task.title}"`);
        console.log(`  Days from meeting: ${task.daysFromMeeting}`);
        console.log(`  Old due date: ${task.dueDate}`);
        console.log(`  New due date: ${newDueDate.toISOString().split('T')[0]}`);

        await db
          .update(tasks)
          .set({ 
            dueDate: newDueDate,
            updatedAt: new Date() 
          })
          .where(eq(tasks.id, task.id));

        console.log(`  Task ${task.id} updated successfully`);
      }
    }

    console.log(`=== P-Day Dependency Update Completed ===`);
  }

  // Cascading task completion: check if all child tasks are completed and auto-complete parent
  async checkAndCompleteParentTask(parentTaskId: number, userId: string): Promise<void> {
    // Get the parent task
    const parentTask = await this.getTask(parentTaskId);
    if (!parentTask) return;

    // Skip if parent is already completed
    if (parentTask.status === 'completed') return;

    // Get all child tasks of this parent
    const childTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));

    // Check if all child tasks are completed
    const allChildrenCompleted = childTasks.length > 0 && childTasks.every(child => child.status === 'completed');

    if (allChildrenCompleted) {
      console.log(`All child tasks completed for parent task "${parentTask.title}" (ID: ${parentTaskId}). Auto-completing parent.`);

      // Auto-complete the parent task
      await db
        .update(tasks)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tasks.id, parentTaskId));

      // Log activity for auto-completion
      await this.createActivityLog({
        userId,
        action: "auto_completed_task",
        entityType: "task",
        entityId: parentTaskId,
        metadata: { taskTitle: parentTask.title, reason: "all_children_completed" },
      });

      // Recursively check if this parent's parent should also be completed
      if (parentTask.parentTaskId) {
        await this.checkAndCompleteParentTask(parentTask.parentTaskId, userId);
      }
    }
  }

  async checkAndUncompleteparentTask(parentTaskId: number, userId: string): Promise<void> {
    // Get the parent task
    const parentTask = await this.getTask(parentTaskId);
    if (!parentTask) return;

    // Skip if parent is already incomplete
    if (parentTask.status !== 'completed') return;

    console.log(`Child task unchecked for parent task "${parentTask.title}" (ID: ${parentTaskId}). Auto-uncompleting parent.`);

    // Auto-uncomplete the parent task since at least one child is now incomplete
    await db
      .update(tasks)
      .set({ 
        status: 'todo',
        completedAt: null,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, parentTaskId));

    // Log activity for auto-uncompletion
    await this.createActivityLog({
      userId,
      action: "auto_uncompleted_task",
      entityType: "task",
      entityId: parentTaskId,
      metadata: { taskTitle: parentTask.title, reason: "child_task_uncompleted" },
    });

    // Recursively check if this parent's parent should also be uncompleted
    if (parentTask.parentTaskId) {
      await this.checkAndUncompleteparentTask(parentTask.parentTaskId, userId);
    }
  }

  async completeAllChildTasks(parentTaskId: number, userId: string): Promise<void> {
    // Get all child tasks of this parent
    const childTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));

    if (childTasks.length === 0) return;

    console.log(`Parent task completed. Auto-completing ${childTasks.length} child tasks.`);

    // Complete all child tasks
    for (const childTask of childTasks) {
      if (childTask.status !== 'completed') {
        await db
          .update(tasks)
          .set({ 
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(tasks.id, childTask.id));

        // Log activity for auto-completion
        await this.createActivityLog({
          userId,
          action: "auto_completed_task",
          entityType: "task",
          entityId: childTask.id,
          metadata: { taskTitle: childTask.title, reason: "parent_task_completed" },
        });

        // Recursively complete any sub-children of this child task
        await this.completeAllChildTasks(childTask.id, userId);
      }
    }
  }

  async uncompleteAllChildTasks(parentTaskId: number, userId: string): Promise<void> {
    // Get all child tasks of this parent
    const childTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));

    if (childTasks.length === 0) return;

    console.log(`Parent task uncompleted. Auto-uncompleting ${childTasks.length} child tasks.`);

    // Uncomplete all child tasks
    for (const childTask of childTasks) {
      if (childTask.status === 'completed') {
        await db
          .update(tasks)
          .set({ 
            status: 'todo',
            completedAt: null,
            updatedAt: new Date()
          })
          .where(eq(tasks.id, childTask.id));

        // Log activity for auto-uncompletion
        await this.createActivityLog({
          userId,
          action: "auto_uncompleted_task",
          entityType: "task",
          entityId: childTask.id,
          metadata: { taskTitle: childTask.title, reason: "parent_task_uncompleted" },
        });

        // Recursively uncomplete any sub-children of this child task
        await this.uncompleteAllChildTasks(childTask.id, userId);
      }
    }
  }

  // Helper method to update dependent tasks when DRPM due date changes
  async updateDependentTasksFromDRPM(drpmTaskId: number, drpmDueDate: Date): Promise<void> {
    // Find all tasks that depend on this DRPM task
    const dependentTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.dependsOnTaskId, drpmTaskId));

    for (const dependentTask of dependentTasks) {
      let newDueDate: Date;

      // Calculate due date based on task type
      if (dependentTask.title.includes('Corrections from DRPM Notes')) {
        // 1 day after DRPM
        newDueDate = new Date(drpmDueDate);
        newDueDate.setDate(newDueDate.getDate() + 1);
      } else if (dependentTask.title.includes('Packet Sealed and Made Available')) {
        // 3 days after DRPM
        newDueDate = new Date(drpmDueDate);
        newDueDate.setDate(newDueDate.getDate() + 3);
      } else {
        // Default: 1 day after DRPM for other dependent tasks
        newDueDate = new Date(drpmDueDate);
        newDueDate.setDate(newDueDate.getDate() + 1);
      }

      // Update the dependent task's due date
      await db
        .update(tasks)
        .set({ 
          dueDate: newDueDate,
          updatedAt: new Date() 
        })
        .where(eq(tasks.id, dependentTask.id));
    }
  }

  // Email interaction operations
  async getEmailInteractions(): Promise<EmailInteraction[]> {
    return await db.select().from(emailInteractions).orderBy(desc(emailInteractions.createdAt));
  }

  async getEmailInteractionsByContact(contactId: number): Promise<EmailInteraction[]> {
    const interactions = await db
      .select()
      .from(emailInteractions)
      .where(eq(emailInteractions.contactId, contactId))
      .orderBy(desc(emailInteractions.createdAt));

    // Group interactions by thread (parent emails and their replies)
    const threaded = this.organizeEmailThreads(interactions);
    return threaded;
  }

  private organizeEmailThreads(interactions: EmailInteraction[]): EmailInteraction[] {
    const threaded: EmailInteraction[] = [];
    const replyMap = new Map<number, EmailInteraction[]>();

    // Separate parent emails and replies
    const parentEmails = interactions.filter(email => !email.parentEmailId);
    const replies = interactions.filter(email => email.parentEmailId);

    // Group replies by parent email ID
    replies.forEach(reply => {
      const parentId = reply.parentEmailId!;
      if (!replyMap.has(parentId)) {
        replyMap.set(parentId, []);
      }
      replyMap.get(parentId)!.push(reply);
    });

    // Add parent emails with their replies
    parentEmails.forEach(parent => {
      threaded.push(parent);
      // Add replies after the parent email (sorted by date)
      const emailReplies = replyMap.get(parent.id) || [];
      emailReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      threaded.push(...emailReplies);
    });

    return threaded;
  }

  async createEmailInteraction(interaction: InsertEmailInteraction, userId: string): Promise<EmailInteraction> {
    const interactionData = { ...interaction, createdBy: userId } as any;
    const [newInteraction] = await db
      .insert(emailInteractions)
      .values(interactionData)
      .returning();
    return newInteraction;
  }

  async deleteEmailInteraction(emailId: number): Promise<void> {
    // First delete any email notifications that reference this email interaction
    await db
      .delete(emailNotifications)
      .where(eq(emailNotifications.emailInteractionId, emailId));

    // Then delete the email interaction itself
    await db
      .delete(emailInteractions)
      .where(eq(emailInteractions.id, emailId));
  }

  // Call transcript operations
  async getCallTranscripts(): Promise<CallTranscript[]> {
    return await db.select().from(callTranscripts).orderBy(desc(callTranscripts.createdAt));
  }

  async getCallTranscriptsByContact(contactId: number): Promise<CallTranscript[]> {
    return await db
      .select()
      .from(callTranscripts)
      .where(eq(callTranscripts.contactId, contactId))
      .orderBy(desc(callTranscripts.createdAt));
  }

  async createCallTranscript(transcript: InsertCallTranscript, userId: string): Promise<CallTranscript> {
    const transcriptData = { ...transcript, createdBy: userId } as any;
    const [newTranscript] = await db
      .insert(callTranscripts)
      .values(transcriptData)
      .returning();
    return newTranscript;
  }

  // Activity log operations
  async getActivityLog(): Promise<ActivityLog[]> {
    return await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(50);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLog)
      .values(log as any)
      .returning();
    return newLog;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalClients: number;
    activeProjects: number;
    prospects: number;
    overdueTasks: number;
  }> {
    const [clientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.contactType, "client"));

    const [projectsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.status, "active"));

    const [prospectsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.contactType, "prospect"));

    const overdueTasksResult = await this.getOverdueTasks();

    return {
      totalClients: clientsResult?.count || 0,
      activeProjects: projectsResult?.count || 0,
      prospects: prospectsResult?.count || 0,
      overdueTasks: overdueTasksResult.length,
    };
  }

  // Project due date operations
  async getProjectsDueSoon(startDate: Date, endDate: Date): Promise<(Project & { progress: number })[]> {
    const projectsWithTasks = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        dueDate: projects.dueDate,
        clientId: projects.clientId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        totalTasks: sql<number>`COUNT(${tasks.id})`,
        completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
      })
      .from(projects)
      .leftJoin(tasks, eq(tasks.projectId, projects.id))
      .where(
        and(
          sql`${projects.dueDate} BETWEEN ${startDate} AND ${endDate}`,
          or(
            eq(projects.status, "planning"),
            eq(projects.status, "active")
          )
        )
      )
      .groupBy(projects.id)
      .orderBy(projects.dueDate);

    return projectsWithTasks.map(project => ({
      ...project,
      progress: project.totalTasks > 0 
        ? Math.round((project.completedTasks / project.totalTasks) * 100)
        : 0
    }));
  }

  // Project comment operations
  async getProjectComments(projectId: number): Promise<ProjectComment[]> {
    return await db.select().from(projectComments)
      .where(eq(projectComments.projectId, projectId))
      .orderBy(desc(projectComments.createdAt));
  }

  async createProjectComment(comment: InsertProjectComment, userId: string): Promise<ProjectComment> {
    const [newComment] = await db
      .insert(projectComments)
      .values({
        ...comment,
        userId,
      })
      .returning();
    return newComment;
  }

  async getContactNotes(contactId: number): Promise<ContactNote[]> {
    const notes = await db
      .select({
        id: contactNotes.id,
        contactId: contactNotes.contactId,
        userId: contactNotes.userId,
        content: contactNotes.content,
        createdAt: contactNotes.createdAt,
        updatedAt: contactNotes.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactNotes)
      .leftJoin(users, eq(contactNotes.userId, users.id))
      .where(eq(contactNotes.contactId, contactId))
      .orderBy(desc(contactNotes.createdAt));

    return notes.map(note => ({
      id: note.id,
      contactId: note.contactId,
      userId: note.userId,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      userFirstName: note.userFirstName,
      userLastName: note.userLastName,
    })) as ContactNote[];
  }

  async createContactNote(note: InsertContactNote, userId: string): Promise<ContactNote> {
    const [contactNote] = await db
      .insert(contactNotes)
      .values({
        ...note,
        userId,
      })
      .returning();

    // Return the created note with user information
    const [newNote] = await db
      .select({
        id: contactNotes.id,
        contactId: contactNotes.contactId,
        userId: contactNotes.userId,
        content: contactNotes.content,
        createdAt: contactNotes.createdAt,
        updatedAt: contactNotes.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactNotes)
      .leftJoin(users, eq(contactNotes.userId, users.id))
      .where(eq(contactNotes.id, contactNote.id));

    return newNote as ContactNote;
  }

  async updateContactNote(noteId: number, updates: Partial<InsertContactNote>): Promise<ContactNote> {
    await db
      .update(contactNotes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contactNotes.id, noteId));

    // Return the updated note with user information
    const [updatedNote] = await db
      .select({
        id: contactNotes.id,
        contactId: contactNotes.contactId,
        userId: contactNotes.userId,
        content: contactNotes.content,
        createdAt: contactNotes.createdAt,
        updatedAt: contactNotes.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactNotes)
      .leftJoin(users, eq(contactNotes.userId, users.id))
      .where(eq(contactNotes.id, noteId));

    return updatedNote as ContactNote;
  }

  async deleteContactNote(noteId: number): Promise<void> {
    await db
      .delete(contactNotes)
      .where(eq(contactNotes.id, noteId));
  }

  // Contact file operations
  async getContactFiles(contactId: number): Promise<ContactFile[]> {
    const files = await db
      .select({
        id: contactFiles.id,
        contactId: contactFiles.contactId,
        userId: contactFiles.userId,
        fileName: contactFiles.fileName,
        originalName: contactFiles.originalName,
        fileSize: contactFiles.fileSize,
        mimeType: contactFiles.mimeType,
        fileUrl: contactFiles.fileUrl,
        fileContent: contactFiles.fileContent,
        isUrl: contactFiles.isUrl,
        createdAt: contactFiles.createdAt,
        updatedAt: contactFiles.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactFiles)
      .leftJoin(users, eq(contactFiles.userId, users.id))
      .where(eq(contactFiles.contactId, contactId))
      .orderBy(desc(contactFiles.createdAt));

    return files as ContactFile[];
  }

  async createContactFile(file: InsertContactFile, userId: string): Promise<ContactFile> {
    const [createdFile] = await db
      .insert(contactFiles)
      .values({
        ...file,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return the created file with user information
    const [fileWithUser] = await db
      .select({
        id: contactFiles.id,
        contactId: contactFiles.contactId,
        userId: contactFiles.userId,
        fileName: contactFiles.fileName,
        originalName: contactFiles.originalName,
        fileSize: contactFiles.fileSize,
        mimeType: contactFiles.mimeType,
        fileUrl: contactFiles.fileUrl,
        fileContent: contactFiles.fileContent,
        isUrl: contactFiles.isUrl,
        createdAt: contactFiles.createdAt,
        updatedAt: contactFiles.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactFiles)
      .leftJoin(users, eq(contactFiles.userId, users.id))
      .where(eq(contactFiles.id, createdFile.id));

    return fileWithUser as ContactFile;
  }

  async updateContactFile(fileId: number, updates: Partial<InsertContactFile>): Promise<ContactFile> {
    await db
      .update(contactFiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contactFiles.id, fileId));

    // Return the updated file with user information
    const [updatedFile] = await db
      .select({
        id: contactFiles.id,
        contactId: contactFiles.contactId,
        userId: contactFiles.userId,
        fileName: contactFiles.fileName,
        originalName: contactFiles.originalName,
        fileSize: contactFiles.fileSize,
        mimeType: contactFiles.mimeType,
        fileUrl: contactFiles.fileUrl,
        fileContent: contactFiles.fileContent,
        isUrl: contactFiles.isUrl,
        createdAt: contactFiles.createdAt,
        updatedAt: contactFiles.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(contactFiles)
      .leftJoin(users, eq(contactFiles.userId, users.id))
      .where(eq(contactFiles.id, fileId));

    return updatedFile as ContactFile;
  }

  async deleteContactFile(fileId: number): Promise<void> {
    await db
      .delete(contactFiles)
      .where(eq(contactFiles.id, fileId));
  }

  // Helper method to find or create a contact for a user
  async findOrCreateUserContact(userId: string): Promise<Contact> {
    // First, try to find an existing contact that represents this user
    // Look for a team member contact with the same email as the user
    const user = await this.getUser(userId);

    if (user?.email) {
      const existingContact = await db
        .select()
        .from(contacts)
        .where(and(
          or(
            eq(contacts.personalEmail, user.email),
            eq(contacts.workEmail, user.email)
          ),
          eq(contacts.contactType, 'team_member')
        ))
        .limit(1);

      if (existingContact.length > 0) {
        return existingContact[0];
      }
    }

    // If no contact exists, create a new one for this user
    const newContact = await this.createContact({
      contactType: 'team_member',
      firstName: user?.firstName || 'User',
      lastName: user?.lastName || userId,
      familyName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : `User ${userId}`,
      personalEmail: user?.email || '',
      status: 'active',
    }, userId);

    return newContact;
  }

  async resolveRoleAssignments(projectId: number): Promise<void> {
    // Get all tasks in the project that have role assignments but no contact assignments
    const tasksWithRoles = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          isNotNull(tasks.assignedToRole)
        )
      );

    if (tasksWithRoles.length === 0) return;

    // Get all active team members (excluding auto-created placeholder team members)
    const teamMembers = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.contactType, 'team_member'),
          eq(contacts.status, 'active'),
          // Exclude placeholder team members created by import scripts
          not(or(
            and(eq(contacts.firstName, 'Admin'), eq(contacts.lastName, 'Assistant')),
            and(eq(contacts.firstName, 'Financial'), eq(contacts.lastName, 'Planner')),
            and(eq(contacts.firstName, 'Insurance'), eq(contacts.lastName, 'Business')),
            and(eq(contacts.firstName, 'Insurance'), eq(contacts.lastName, 'Health'))
          ))
        )
      );

    console.log(`Found ${teamMembers.length} real team members for role resolution (excluding placeholders)`);

    // Process each task
    for (const task of tasksWithRoles) {
      if (!task.assignedToRole || task.assignedToRole.length === 0) continue;

      const assignedContactIds = [];
      const unassignedRoles = [];

      // Resolve each role to contact IDs
      for (const role of task.assignedToRole) {
        const matchingContacts = teamMembers.filter(contact => contact.role === role);

        if (matchingContacts.length > 0) {
          // Found active team members for this role
          for (const contact of matchingContacts) {
            if (!assignedContactIds.includes(contact.id)) {
              assignedContactIds.push(contact.id);
            }
          }
        } else {
          // No active team member found for this role, keep as role assignment
          unassignedRoles.push(role);
          console.log(`No team member found for role: ${role}. Keeping as role assignment for manual assignment.`);
        }
      }

      // Update the task - assign resolved contacts and keep unassigned roles for manual assignment
      await db
        .update(tasks)
        .set({
          assignedTo: assignedContactIds.length > 0 ? assignedContactIds : null,
          assignedToRole: unassignedRoles.length > 0 ? unassignedRoles : null,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, task.id));

      if (assignedContactIds.length > 0) {
        console.log(`Resolved task ${task.id} (${task.title}) - roles resolved to contacts: ${assignedContactIds}`);
      }
      if (unassignedRoles.length > 0) {
        console.log(`Task ${task.id} (${task.title}) - roles require manual assignment: ${unassignedRoles}`);
      }
    }

    // Log activity
    await this.createActivityLog({
      userId: 'system',
      action: "resolved_role_assignments",
      entityType: "project", 
      entityId: projectId,
      description: `Resolved role-based assignments for ${tasksWithRoles.length} tasks`,
    });
  }

  async getUserTaskPriority(taskId: number, userId: string): Promise<UserTaskPriority | undefined> {
    const [priority] = await db
      .select()
      .from(userTaskPriorities)
      .where(
        and(
          eq(userTaskPriorities.taskId, taskId),
          eq(userTaskPriorities.userId, userId)
        )
      )
      .limit(1);

    return priority;
  }

  async setUserTaskPriority(taskId: number, userId: string, contactId: number | null, priority: number): Promise<UserTaskPriority> {
    // Check if priority record already exists
    const existing = await this.getUserTaskPriority(taskId, userId);

    if (existing) {
      // Update existing priority
      const [updated] = await db
        .update(userTaskPriorities)
        .set({
          priority,
          contactId,
          updatedAt: new Date()
        })
        .where(eq(userTaskPriorities.id, existing.id))
        .returning();

      return updated;
    } else {
      // Create new priority record
      const [created] = await db
        .insert(userTaskPriorities)
        .values({
          taskId,
          userId,
          contactId,
          priority
        })
        .returning();

      return created;
    }
  }

  async getUserTasksWithPriorities(userId: string): Promise<(Task & { userPriority: number | null })[]> {
    // Get the full user object first
    const user = await this.getUser(userId);
    if (!user) {
      console.log('No user found for userId:', userId);
      return [];
    }

    // Then get the contact ID
    const userContact = await this.getUserContactId(user);
    console.log('getUserTasksWithPriorities - userContact:', userContact, 'userId:', userId, 'user:', user.firstName, user.lastName);

    if (!userContact) {
      console.log('No userContact found for user:', user.firstName, user.lastName);
      return [];
    }

    // Simplified query - just get tasks assigned to this user's contact ID
    const results = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        parentTaskId: tasks.parentTaskId,
        assignedTo: tasks.assignedTo,
        assignedToRole: tasks.assignedToRole,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        daysFromMeeting: tasks.daysFromMeeting,
        dependsOnTaskId: tasks.dependsOnTaskId,
        completedAt: tasks.completedAt,
        sortOrder: tasks.sortOrder,
        level: tasks.level,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdBy: tasks.createdBy,
        userPriority: userTaskPriorities.priority
      })
      .from(tasks)
      .leftJoin(
        userTaskPriorities,
        and(
          eq(userTaskPriorities.taskId, tasks.id),
          eq(userTaskPriorities.userId, userId)
        )
      )
      .where(
        and(
          isNotNull(tasks.assignedTo),
          or(
            isNotNull(tasks.projectId), // Include project tasks
            and(
              isNull(tasks.projectId), // Include standalone tasks with assignments
              sql`array_length(${tasks.assignedTo}, 1) > 0`
            )
          ),
          sql`${userContact} = ANY(${tasks.assignedTo})`
        )
      );

    console.log('getUserTasksWithPriorities - found', results.length, 'tasks');

    return results.map(task => ({
      ...task,
      userPriority: task.userPriority || task.priority || 50
    }));
  }

  // User invitation methods
  async createUserInvitation(invitation: InsertUserInvitation & { invitedBy: string, expiresAt?: Date }): Promise<UserInvitation> {
    // Generate a unique invitation code
    const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Set expiration to 7 days from now if not provided
    const expiresAt = invitation.expiresAt || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    })();

    const [created] = await db
      .insert(userInvitations)
      .values({
        ...invitation,
        invitationCode,
        expiresAt,
      })
      .returning();

    return created;
  }

  async getUserInvitation(invitationCode: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.invitationCode, invitationCode));

    return invitation;
  }

  async getUserInvitations(invitedBy?: string): Promise<UserInvitation[]> {
    let query = db
      .select()
      .from(userInvitations)
      .orderBy(desc(userInvitations.createdAt));

    if (invitedBy) {
      query = query.where(eq(userInvitations.invitedBy, invitedBy));
    }

    return await query;
  }

  async acceptUserInvitation(invitationCode: string, userId: string): Promise<UserInvitation> {
    const [updated] = await db
      .update(userInvitations)
      .set({ 
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(userInvitations.invitationCode, invitationCode))
      .returning();

    return updated;
  }

  async expireInvitation(invitationCode: string): Promise<void> {
    await db
      .update(userInvitations)
      .set({ status: 'expired' })
      .where(eq(userInvitations.invitationCode, invitationCode));
  }

  async deleteUserInvitation(invitationId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userInvitations)
      .where(and(
        eq(userInvitations.id, invitationId),
        eq(userInvitations.invitedBy, userId)
      ))
      .returning();

    return result.length > 0;
  }

  // Invitation request methods
  async createInvitationRequest(request: InsertInvitationRequest): Promise<InvitationRequest> {
    const [created] = await db
      .insert(invitationRequests)
      .values(request)
      .returning();

    return created;
  }

  async getInvitationRequests(): Promise<InvitationRequest[]> {
    return await db
      .select()
      .from(invitationRequests)
      .orderBy(desc(invitationRequests.createdAt));
  }

  async updateInvitationRequestStatus(id: number, status: string, reviewedBy: string): Promise<InvitationRequest> {
    const [updated] = await db
      .update(invitationRequests)
      .set({
        status: status as any,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invitationRequests.id, id))
      .returning();

    return updated;
  }

  async deleteInvitationRequest(id: number): Promise<boolean> {
    const result = await db
      .delete(invitationRequests)
      .where(eq(invitationRequests.id, id))
      .returning();

    return result.length > 0;
  }

  // User access control methods
  async getUserAccessLevel(userId: string): Promise<string | undefined> {
    const user = await this.getUser(userId);
    return user?.accessLevel;
  }

  async updateUserAccessLevel(userId: string, accessLevel: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ 
        accessLevel: accessLevel as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }
  // Contact business operations
  async getContactBusinesses(contactId: number): Promise<ContactBusiness[]> {
    return await db
      .select()
      .from(contactBusinesses)
      .where(eq(contactBusinesses.contactId, contactId))
      .orderBy(contactBusinesses.sortOrder, contactBusinesses.createdAt);
  }

  async createContactBusiness(business: InsertContactBusiness): Promise<ContactBusiness> {
    const [created] = await db
      .insert(contactBusinesses)
      .values(business)
      .returning();
    return created;
  }

  async updateContactBusiness(businessId: number, updates: Partial<InsertContactBusiness>): Promise<ContactBusiness> {
    const [updated] = await db
      .update(contactBusinesses)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(contactBusinesses.id, businessId))
      .returning();
    return updated;
  }

  async deleteContactBusiness(businessId: number): Promise<void> {
    await db
      .delete(contactBusinesses)
      .where(eq(contactBusinesses.id, businessId));
  }

  // User activity tracking operations with batching optimization
  private activityBuffer: InsertUserActivity[] = [];
  private bufferTimeout: NodeJS.Timeout | null = null;

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    // For immediate logging (when needed)
    const [created] = await db
      .insert(userActivities)
      .values(activity)
      .returning();
    return created;
  }

  // Batch insert for better performance (optional for future use)
  batchUserActivity(activity: InsertUserActivity): void {
    this.activityBuffer.push(activity);

    // Clear existing timeout
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    // Set new timeout to flush buffer after 5 seconds or when buffer reaches 10 items
    this.bufferTimeout = setTimeout(() => {
      this.flushActivityBuffer();
    }, 5000);

    // Flush immediately if buffer is full
    if (this.activityBuffer.length >= 10) {
      this.flushActivityBuffer();
    }
  }

  private async flushActivityBuffer(): void {
    if (this.activityBuffer.length === 0) return;

    try {
      const activities = [...this.activityBuffer];
      this.activityBuffer = [];

      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = null;
      }

      await db.insert(userActivities).values(activities);
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
    }
  }

  async getUserActivities(timeRange: string, actionFilter: string, userFilter: string): Promise<UserActivity[]> {
    let query = db.select().from(userActivities);

    // Apply time range filter
    const now = new Date();
    let timeThreshold: Date;

    switch (timeRange) {
      case '1h':
        timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const conditions = [sql`${userActivities.timestamp} >= ${timeThreshold}`];

    // Apply action filter
    if (actionFilter !== 'all') {
      conditions.push(eq(userActivities.action, actionFilter));
    }

    // Apply user filter
    if (userFilter !== 'all') {
      conditions.push(eq(userActivities.userId, userFilter));
    }

    query = query.where(and(...conditions));

    // Limit to 50 records and add index hint for better performance
    return await query.orderBy(desc(userActivities.timestamp)).limit(50);
  }

  async getUserActivityStats(timeRange: string): Promise<{
    activeUsers: number;
    totalActivities: number;
    loginSessions: number;
    uniqueIPs: number;
  }> {
    const now = new Date();
    let timeThreshold: Date;

    switch (timeRange) {
      case '1h':
        timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const timeCondition = sql`${userActivities.timestamp} >= ${timeThreshold}`;

    // Get active users count
    const [activeUsersResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${userActivities.userId})` })
      .from(userActivities)
      .where(timeCondition);

    // Get total activities count
    const [totalActivitiesResult] = await db
      .select({ count: count() })
      .from(userActivities)
      .where(timeCondition);

    // Get login sessions count - count unique user sessions (first page_view per IP+User combo)
    // Since Replit Auth doesn't create explicit 'login' events, we'll count unique sessions
    const [loginSessionsResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT CONCAT(${userActivities.userId}, ':', COALESCE(${userActivities.ipAddress}, 'unknown')))` })
      .from(userActivities)
      .where(and(timeCondition, eq(userActivities.action, 'page_view')));

    // Get unique IPs count
    const [uniqueIPsResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${userActivities.ipAddress})` })
      .from(userActivities)
      .where(and(timeCondition, isNotNull(userActivities.ipAddress)));

    return {
      activeUsers: activeUsersResult.count || 0,
      totalActivities: totalActivitiesResult.count || 0,
      loginSessions: loginSessionsResult.count || 0,
      uniqueIPs: uniqueIPsResult.count || 0,
    };
  }

  // Two-factor authentication operations
  async enableTwoFactorAuth(userId: string, secret: string, backupCodes: string[]): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        backupCodes: backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async disableTwoFactorAuth(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        backupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserBackupCodes(userId: string, backupCodes: string[]): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        backupCodes: backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, userId));
    return user?.twoFactorEnabled || false;
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const [user] = await db
      .select({ 
        twoFactorSecret: users.twoFactorSecret, 
        twoFactorEnabled: users.twoFactorEnabled 
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Import speakeasy for verification
    const speakeasy = require('speakeasy');

    return speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow for time drift
    });
  }

  // Search operations
  async searchContacts(query: string): Promise<Contact[]> {
    // Simplified search to avoid SQL parameter overflow
    return await db
      .select()
      .from(contacts)
      .where(
        or(
          // Core contact information
          ilike(contacts.firstName, `%${query}%`),
          ilike(contacts.lastName, `%${query}%`),
          ilike(contacts.familyName, `%${query}%`),
          ilike(contacts.nickname, `%${query}%`),

          // Spouse information (key for Ted Smith search)
          ilike(contacts.spouseFirstName, `%${query}%`),
          ilike(contacts.spouseLastName, `%${query}%`),
          ilike(contacts.spouseNickname, `%${query}%`),

          // Contact details
          ilike(contacts.personalEmail, `%${query}%`),
          ilike(contacts.workEmail, `%${query}%`),
          ilike(contacts.spousePersonalEmail, `%${query}%`),
          ilike(contacts.spouseWorkEmail, `%${query}%`),
          ilike(contacts.cellPhone, `%${query}%`),
          ilike(contacts.workPhone, `%${query}%`),
          ilike(contacts.businessPhone, `%${query}%`),
          ilike(contacts.spouseCellPhone, `%${query}%`),
          ilike(contacts.spouseWorkPhone, `%${query}%`),

          // Business and location
          ilike(contacts.businessName, `%${query}%`),
          ilike(contacts.mailingAddressCity, `%${query}%`),
          ilike(contacts.mailingAddressState, `%${query}%`),
          ilike(contacts.homeAddressCity, `%${query}%`),
          ilike(contacts.homeAddressState, `%${query}%`)
        )
      )
      .limit(20);
  }

  async searchProjects(query: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(
        or(
          ilike(projects.name, `%${query}%`),
          ilike(projects.description, `%${query}%`),
          ilike(projects.projectType, `%${query}%`),
          ilike(projects.status, `%${query}%`)
        )
      )
      .limit(20);
  }

  async searchTasks(query: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        or(
          ilike(tasks.title, `%${query}%`),
          ilike(tasks.description, `%${query}%`),
          ilike(tasks.status, `%${query}%`),
          ilike(tasks.priority, `%${query}%`),
          ilike(tasks.assignedToRole, `%${query}%`)
        )
      )
      .limit(20);
  }

  async searchContactNotes(query: string): Promise<(ContactNote & { authorName?: string })[]> {
    const notesWithAuthors = await db
      .select({
        id: contactNotes.id,
        contactId: contactNotes.contactId,
        content: contactNotes.content,
        createdAt: contactNotes.createdAt,
        updatedAt: contactNotes.updatedAt,
        userId: contactNotes.userId,
        authorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('authorName')
      })
      .from(contactNotes)
      .leftJoin(users, eq(contactNotes.userId, users.id))
      .where(ilike(contactNotes.content, `%${query}%`))
      .limit(20);

    return notesWithAuthors;
  }

  // Add comprehensive search methods for all data types
  async searchEmailInteractions(query: string): Promise<any[]> {
    const emailResults = await db
      .select({
        id: emailInteractions.id,
        contactId: emailInteractions.contactId,
        subject: emailInteractions.subject,
        body: emailInteractions.body,
        sender: emailInteractions.sender,
        recipient: emailInteractions.recipient,
        timestamp: emailInteractions.timestamp,
        emailType: emailInteractions.emailType
      })
      .from(emailInteractions)
      .where(
        or(
          ilike(emailInteractions.subject, `%${query}%`),
          ilike(emailInteractions.body, `%${query}%`),
          ilike(emailInteractions.sender, `%${query}%`),
          ilike(emailInteractions.recipient, `%${query}%`)
        )
      )
      .limit(20);

    return emailResults;
  }

  async searchProjectComments(query: string): Promise<any[]> {
    const comments = await db
      .select({
        id: projectComments.id,
        projectId: projectComments.projectId,
        content: projectComments.content,
        createdAt: projectComments.createdAt,
        userId: projectComments.userId,
        authorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('authorName')
      })
      .from(projectComments)
      .leftJoin(users, eq(projectComments.userId, users.id))
      .where(ilike(projectComments.content, `%${query}%`))
      .limit(20);

    return comments;
  }

  async searchTaskComments(query: string): Promise<any[]> {
    const comments = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        userId: taskComments.userId,
        authorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('authorName')
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(ilike(taskComments.content, `%${query}%`))
      .limit(20);

    return comments;
  }

  async searchContactBusinesses(query: string): Promise<any[]> {
    const businesses = await db
      .select()
      .from(contactBusinesses)
      .where(
        or(
          ilike(contactBusinesses.businessName, `%${query}%`),
          ilike(contactBusinesses.businessAddressStreet1, `%${query}%`),
          ilike(contactBusinesses.businessAddressCity, `%${query}%`),
          ilike(contactBusinesses.businessAddressState, `%${query}%`),
          ilike(contactBusinesses.businessPhone, `%${query}%`),
          ilike(contactBusinesses.officeManagerName, `%${query}%`),
          ilike(contactBusinesses.businessEin, `%${query}%`),
          ilike(contactBusinesses.partnershipDetails, `%${query}%`)
        )
      )
      .limit(20);

    return businesses;
  }

  // Mentions operations
  async getMentionsForUser(userId: string): Promise<(Mention & { 
    mentionedBy: { firstName: string; lastName: string; profileImageUrl?: string; }; 
    source?: any; 
  })[]> {
    const mentionsWithSources = await db
      .select({
        id: mentions.id,
        mentionedUserId: mentions.mentionedUserId,
        mentionedByUserId: mentions.mentionedByUserId,
        sourceType: mentions.sourceType,
        sourceId: mentions.sourceId,
        contextText: mentions.contextText,
        isRead: mentions.isRead,
        createdAt: mentions.createdAt,
        mentionedByFirstName: users.firstName,
        mentionedByLastName: users.lastName,
        mentionedByProfileImage: users.profileImageUrl,
      })
      .from(mentions)
      .leftJoin(users, eq(mentions.mentionedByUserId, users.id))
      .where(eq(mentions.mentionedUserId, userId))
      .orderBy(desc(mentions.createdAt));

    // Enrich with source information
    const enrichedMentions = await Promise.all(
      mentionsWithSources.map(async (mention) => {
        let source = {};

        try {
          switch (mention.sourceType) {
            case 'task_comment':
              const task = await this.getTask(mention.sourceId);
              if (task) {
                source = {
                  id: task.id,
                  taskTitle: task.title,
                };
              }
              break;
            case 'contact_note':
              const contact = await this.getContact(mention.sourceId);
              if (contact) {
                source = {
                  id: contact.id,
                  contactName: contact.familyName || `${contact.firstName} ${contact.lastName}`.trim(),
                };
              }
              break;
            case 'project_comment':
              const project = await this.getProject(mention.sourceId);
              if (project) {
                source = {
                  id: project.id,
                  projectName: project.name,
                };
              }
              break;
          }
        } catch (error) {
          console.error(`Error enriching mention source ${mention.sourceType}:${mention.sourceId}:`, error);
        }

        return {
          id: mention.id,
          mentionedUserId: mention.mentionedUserId,
          mentionedByUserId: mention.mentionedByUserId,
          sourceType: mention.sourceType,
          sourceId: mention.sourceId,
          contextText: mention.contextText,
          isRead: mention.isRead,
          createdAt: mention.createdAt,
          mentionedBy: {
            firstName: mention.mentionedByFirstName || 'Unknown',
            lastName: mention.mentionedByLastName || 'User',
            profileImageUrl: mention.mentionedByProfileImage,
          },
          source,
        };
      })
    );

    return enrichedMentions;
  }

  async createMention(mention: InsertMention): Promise<Mention> {
    const [created] = await db
      .insert(mentions)
      .values(mention)
      .returning();

    return created;
  }

  async markMentionAsRead(mentionId: number, userId: string): Promise<void> {
    await db
      .update(mentions)
      .set({ isRead: true })
      .where(
        and(
          eq(mentions.id, mentionId),
          eq(mentions.mentionedUserId, userId)
        )
      );
  }

  async processMentionsInText(text: string, sourceType: string, sourceId: number, authorId: string): Promise<void> {
    // Find @mentions in text - support both @FirstName and @FirstLast formats
    const mentionMatches = text.match(/@([A-Za-z]+(?:[A-Za-z]+)?)/g);

    if (!mentionMatches) return;

    // Get all team members to match names
    const teamMembers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.isActive, true));

    for (const match of mentionMatches) {
      const mentionText = match.substring(1).toLowerCase(); // Remove @ and lowercase

      // Try different matching strategies
      let mentionedUsers = [];

      // Strategy 1: Exact first name match
      const firstNameMatches = teamMembers.filter(
        user => user.firstName.toLowerCase() === mentionText
      );

      // Strategy 2: FirstLast format (e.g., @ChadTennant)
      const firstLastMatches = teamMembers.filter(
        user => (user.firstName + user.lastName).toLowerCase() === mentionText
      );

      // Strategy 3: First name + last initial (e.g., @ChadT)
      const firstLastInitialMatches = teamMembers.filter(
        user => (user.firstName + user.lastName.charAt(0)).toLowerCase() === mentionText
      );

      // Prioritize matches: exact firstlast > first+initial > first name only
      if (firstLastMatches.length > 0) {
        mentionedUsers = firstLastMatches;
      } else if (firstLastInitialMatches.length > 0) {
        mentionedUsers = firstLastInitialMatches;
      } else if (firstNameMatches.length === 1) {
        // Only use first name if there's exactly one match
        mentionedUsers = firstNameMatches;
      }

      // If multiple people have the same first name and no unique identifier was used, skip
      if (firstNameMatches.length > 1 && mentionedUsers.length === 0) {
        console.log(`Ambiguous mention @${mentionText} - multiple users with name: ${firstNameMatches.map(u => `${u.firstName} ${u.lastName}`).join(', ')}`);
        continue;
      }

      // Create mentions for resolved users
      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id !== authorId) {
          await this.createMention({
            mentionedUserId: mentionedUser.id,
            mentionedByUserId: authorId,
            sourceType,
            sourceId,
            contextText: text.length > 200 ? text.substring(0, 197) + '...' : text,
            isRead: false,
          });
        }
      }
    }
  }

  // Task due date notifications
  async getTasksDueSoon(userId: string): Promise<(Task & { projectName?: string; daysUntilDue: number })[]> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // Get user's contact ID to filter assigned tasks
    const userContact = await db
      .select({ id: contacts.id })
      .from(contacts)
      .leftJoin(users, and(
        eq(users.firstName, contacts.firstName),
        eq(users.lastName, contacts.lastName)
      ))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userContact.length) {
      return [];
    }

    const contactId = userContact[0].id;

    // Get tasks assigned to user that are due within the next week and not completed
    const tasksWithProjects = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        status: tasks.status,
        assignedTo: tasks.assignedTo,
        assignedToRole: tasks.assignedToRole,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        parentTaskId: tasks.parentTaskId,
        level: tasks.level,
        sortOrder: tasks.sortOrder,
        dependsOnTaskId: tasks.dependsOnTaskId,
        daysFromMeeting: tasks.daysFromMeeting,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          sql`${tasks.assignedTo} @> ARRAY[${contactId}]::integer[]`,
          not(eq(tasks.status, 'completed')),
          isNotNull(tasks.dueDate),
          sql`DATE(${tasks.dueDate}) >= DATE(${now.toISOString()})`,
          sql`DATE(${tasks.dueDate}) <= DATE(${nextWeek.toISOString()})`
        )
      )
      .orderBy(tasks.dueDate);

    // Calculate days until due and add to results
    return tasksWithProjects.map(task => {
      const dueDate = new Date(task.dueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        ...task,
        daysUntilDue
      };
    });
  }

  // Get overdue tasks for user
  async getOverdueTasks(userId: string): Promise<(Task & { projectName?: string; daysOverdue: number })[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Get user's contact ID to filter assigned tasks
    const userContact = await db
      .select({ id: contacts.id })
      .from(contacts)
      .leftJoin(users, and(
        eq(users.firstName, contacts.firstName),
        eq(users.lastName, contacts.lastName)
      ))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userContact.length) {
      return [];
    }

    const contactId = userContact[0].id;

    // Get tasks assigned to user that are overdue and not completed
    const tasksWithProjects = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        status: tasks.status,
        assignedTo: tasks.assignedTo,
        assignedToRole: tasks.assignedToRole,
        projectId: tasks.projectId,
        milestoneId: tasks.milestoneId,
        parentTaskId: tasks.parentTaskId,
        level: tasks.level,
        sortOrder: tasks.sortOrder,
        dependsOnTaskId: tasks.dependsOnTaskId,
        daysFromMeeting: tasks.daysFromMeeting,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        and(
          sql`${tasks.assignedTo} @> ARRAY[${contactId}]::integer[]`,
          not(eq(tasks.status, 'completed')),
          isNotNull(tasks.dueDate),
          sql`DATE(${tasks.dueDate}) < DATE(${now.toISOString()})`
        )
      )
      .orderBy(tasks.dueDate);

    // Calculate days overdue and add to results
    return tasksWithProjects.map(task => {
      const dueDate = new Date(task.dueDate);
      const timeDiff = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        ...task,
        daysOverdue
      };
    });
  }

  // Calendar operations
  async getUserCalendarConnections(userId: string): Promise<CalendarConnection[]> {
    return await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId))
      .orderBy(desc(calendarConnections.createdAt));
  }

  async createCalendarConnection(connection: InsertCalendarConnection): Promise<CalendarConnection> {
    const [newConnection] = await db
      .insert(calendarConnections)
      .values({
        ...connection,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Log activity
    await this.createActivityLog({
      userId: connection.userId,
      action: "created_calendar_connection",
      entityType: "calendar_connection",
      entityId: newConnection.id,
      description: `Connected ${connection.provider} calendar`,
      metadata: { provider: connection.provider, calendarName: connection.calendarName }
    });

    return newConnection;
  }

  async updateCalendarConnection(id: number, updates: Partial<CalendarConnection>): Promise<CalendarConnection> {
    const [updatedConnection] = await db
      .update(calendarConnections)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, id))
      .returning();

    if (!updatedConnection) {
      throw new Error(`Calendar connection with id ${id} not found`);
    }

    // Log activity
    await this.createActivityLog({
      userId: updatedConnection.userId,
      action: "updated_calendar_connection",
      entityType: "calendar_connection",
      entityId: id,
      description: `Updated ${updatedConnection.provider} calendar connection`,
      metadata: updates
    });

    return updatedConnection;
  }

  async deleteCalendarConnection(id: number, userId: string): Promise<void> {
    const connection = await this.getCalendarConnection(id);
    if (!connection || connection.userId !== userId) {
      throw new Error("Calendar connection not found or access denied");
    }

    await db
      .delete(calendarConnections)
      .where(eq(calendarConnections.id, id));

    // Log activity
    await this.createActivityLog({
      userId,
      action: "deleted_calendar_connection",
      entityType: "calendar_connection",
      entityId: id,
      description: `Deleted ${connection.provider} calendar connection`,
      metadata: { provider: connection.provider, calendarName: connection.calendarName }
    });
  }

  async getCalendarConnection(id: number): Promise<CalendarConnection | undefined> {
    const [connection] = await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.id, id));
    return connection;
  }

  // Email notification operations
  async getEmailNotifications(userId: string): Promise<any[]> {
    const notifications = await db
      .select({
        id: emailNotifications.id,
        emailInteractionId: emailNotifications.emailInteractionId,
        isRead: emailNotifications.isRead,
        createdAt: emailNotifications.createdAt,
        email: {
          id: emailInteractions.id,
          contactId: emailInteractions.contactId,
          subject: emailInteractions.subject,
          sender: emailInteractions.sender,
          sentAt: emailInteractions.sentAt,
          emailType: emailInteractions.emailType,
          contact: {
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            familyName: contacts.familyName,
          },
        },
      })
      .from(emailNotifications)
      .innerJoin(emailInteractions, eq(emailNotifications.emailInteractionId, emailInteractions.id))
      .innerJoin(contacts, eq(emailInteractions.contactId, contacts.id))
      .where(and(
        eq(emailNotifications.userId, userId),
        eq(emailNotifications.isRead, false)
      ))
      .orderBy(desc(emailNotifications.createdAt));

    return notifications;
  }

  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const [created] = await db
      .insert(emailNotifications)
      .values(notification)
      .returning();
    return created;
  }

  async markEmailNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ isRead: true })
      .where(and(
        eq(emailNotifications.id, notificationId),
        eq(emailNotifications.userId, userId)
      ));
  }

  async markAllEmailNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ isRead: true })
      .where(eq(emailNotifications.userId, userId));
  }

  // User-specific methods for email configuration
  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }

  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    return user || null;
  }

  async updateUser(userId: string, updates: Partial<any>): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updated || null;
  }

  // Two-Factor Authentication operations
  async enable2FA(userId: string, secret: string, backupCodes: any[]): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        backupCodes: backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  async disable2FA(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        backupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  async update2FABackupCodes(userId: string, backupCodes: any[]): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        backupCodes: backupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }

  async get2FAStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const [user] = await db
      .select({
        twoFactorEnabled: users.twoFactorEnabled,
        backupCodes: users.backupCodes,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    const backupCodesRemaining = user.backupCodes 
      ? (user.backupCodes as any[]).filter((code: any) => !code.used).length 
      : 0;

    return {
      enabled: user.twoFactorEnabled || false,
      backupCodesRemaining,
    };
  }
}

export const storage = new DatabaseStorage();