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
  callTranscripts,
  activityLog,
  projectComments,
  contactNotes,
  contactFiles,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

  // Email interaction operations
  getEmailInteractions(): Promise<EmailInteraction[]>;
  getEmailInteractionsByContact(contactId: number): Promise<EmailInteraction[]>;
  createEmailInteraction(interaction: InsertEmailInteraction, userId: string): Promise<EmailInteraction>;

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
  getProjectsDueSoon(startDate: Date, endDate: Date): Promise<Project[]>;

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
    
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    try {
      // Check if contact has assigned tasks
      const assignedTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.assignedTo, id));
      
      if (assignedTasks.length > 0) {
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

  async searchContacts(query: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(
        or(
          ilike(contacts.firstName, `%${query}%`),
          ilike(contacts.lastName, `%${query}%`),
          ilike(contacts.email, `%${query}%`),
          ilike(contacts.company, `%${query}%`)
        )
      )
      .orderBy(desc(contacts.createdAt));
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
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    // First, delete all related records to avoid foreign key constraint issues
    
    // Delete all tasks associated with the project
    await db.delete(tasks).where(eq(tasks.projectId, id));
    
    // Delete all comments associated with the project
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
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask, userId: string): Promise<Task> {
    // Process date field - convert string date to Date object
    const processedTask = { ...task };
    if (processedTask.dueDate && typeof processedTask.dueDate === 'string' && processedTask.dueDate.trim()) {
      processedTask.dueDate = new Date(processedTask.dueDate);
    } else if (processedTask.dueDate === '') {
      processedTask.dueDate = null;
    }
    
    // Handle assignment - convert team_xxx to contact ID, or handle me_xxx for current user
    if (processedTask.assignedTo && typeof processedTask.assignedTo === 'string') {
      if (processedTask.assignedTo.startsWith('team_')) {
        // Extract contact ID from team_xxx format
        const contactId = parseInt(processedTask.assignedTo.replace('team_', ''));
        // Verify the contact is a team member
        const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
        if (contact.length > 0 && contact[0].contactType === 'team_member') {
          processedTask.assignedTo = contactId;
        } else {
          processedTask.assignedTo = null;
        }
      } else if (processedTask.assignedTo.startsWith('me_')) {
        // Handle "Assign to Me" - create or find user contact
        const currentUserId = processedTask.assignedTo.replace('me_', '');
        // Find or create a contact for the current user
        const userContact = await this.findOrCreateUserContact(currentUserId);
        processedTask.assignedTo = userContact.id;
      } else if (processedTask.assignedTo !== 'unassigned' && processedTask.assignedTo !== '') {
        // This is a user ID, we need to find or create a corresponding contact
        // For now, set to null since we don't have a direct user->contact mapping
        processedTask.assignedTo = null;
      } else {
        processedTask.assignedTo = null;
      }
    }
    
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

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    // Process date field - convert string date to Date object
    const processedTask = { ...task };
    if (processedTask.dueDate && typeof processedTask.dueDate === 'string' && processedTask.dueDate.trim()) {
      processedTask.dueDate = new Date(processedTask.dueDate);
    } else if (processedTask.dueDate === '') {
      processedTask.dueDate = null;
    }
    
    // Handle assignment - convert team_xxx to contact ID, or handle me_xxx for current user
    if (processedTask.assignedTo && typeof processedTask.assignedTo === 'string') {
      if (processedTask.assignedTo.startsWith('team_')) {
        // Extract contact ID from team_xxx format
        const contactId = parseInt(processedTask.assignedTo.replace('team_', ''));
        // Verify the contact is a team member
        const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
        if (contact.length > 0 && contact[0].contactType === 'team_member') {
          processedTask.assignedTo = contactId;
        } else {
          processedTask.assignedTo = null;
        }
      } else if (processedTask.assignedTo.startsWith('me_')) {
        // Handle "Assign to Me" - create or find user contact
        const currentUserId = processedTask.assignedTo.replace('me_', '');
        // Find or create a contact for the current user
        const userContact = await this.findOrCreateUserContact(currentUserId);
        processedTask.assignedTo = userContact.id;
      } else if (processedTask.assignedTo !== 'unassigned' && processedTask.assignedTo !== '') {
        // This is a user ID, we need to find or create a corresponding contact
        // For now, set to null since we don't have a direct user->contact mapping
        processedTask.assignedTo = null;
      } else {
        processedTask.assignedTo = null;
      }
    }
    
    console.log('Final processed task for update:', processedTask);
    
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...processedTask, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
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
      .where(eq(tasks.assignedTo, userId))
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
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt));
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
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        projectId: tasks.projectId,
        status: tasks.status,
        priority: tasks.priority,
        estimatedDays: tasks.estimatedDays,
        dueDate: tasks.dueDate,
        assignedTo: tasks.assignedTo,
        assignedToRole: tasks.assignedToRole,
        parentTaskId: tasks.parentTaskId,
        milestoneId: tasks.milestoneId,
        daysFromMeeting: tasks.daysFromMeeting,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdBy: tasks.createdBy
      })
      .from(tasks)
      .leftJoin(milestones, eq(tasks.milestoneId, milestones.id))
      .where(eq(milestones.templateId, templateId))
      .orderBy(tasks.createdAt);
    
    return result;
  }

  async getProjectTemplateMilestones(templateId: number): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.templateId, templateId))
      .orderBy(milestones.createdAt);
  }

  // Email interaction operations
  async getEmailInteractions(): Promise<EmailInteraction[]> {
    return await db.select().from(emailInteractions).orderBy(desc(emailInteractions.createdAt));
  }

  async getEmailInteractionsByContact(contactId: number): Promise<EmailInteraction[]> {
    return await db
      .select()
      .from(emailInteractions)
      .where(eq(emailInteractions.contactId, contactId))
      .orderBy(desc(emailInteractions.createdAt));
  }

  async createEmailInteraction(interaction: InsertEmailInteraction, userId: string): Promise<EmailInteraction> {
    const interactionData = { ...interaction, createdBy: userId } as any;
    const [newInteraction] = await db
      .insert(emailInteractions)
      .values(interactionData)
      .returning();
    return newInteraction;
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
  async getProjectsDueSoon(startDate: Date, endDate: Date): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(
        and(
          sql`${projects.dueDate} BETWEEN ${startDate} AND ${endDate}`,
          or(
            eq(projects.status, "planning"),
            eq(projects.status, "active")
          )
        )
      )
      .orderBy(projects.dueDate);
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
}

export const storage = new DatabaseStorage();
