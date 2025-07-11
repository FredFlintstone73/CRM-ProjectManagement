import {
  users,
  contacts,
  projects,
  tasks,
  projectTemplates,
  emailInteractions,
  callTranscripts,
  activityLog,
  type User,
  type UpsertUser,
  type Contact,
  type InsertContact,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type EmailInteraction,
  type InsertEmailInteraction,
  type CallTranscript,
  type InsertCallTranscript,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";

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

  // Project template operations
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getProjectTemplate(id: number): Promise<ProjectTemplate | undefined>;
  createProjectTemplate(template: InsertProjectTemplate, userId: string): Promise<ProjectTemplate>;
  updateProjectTemplate(id: number, template: Partial<InsertProjectTemplate>): Promise<ProjectTemplate>;
  deleteProjectTemplate(id: number): Promise<void>;

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
    const contactData = { ...contact, createdBy: userId };
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
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
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
    const projectData = { ...project, createdBy: userId };
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
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
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
    const taskData = { ...task, createdBy: userId };
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
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
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

  // Project template operations
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return await db.select().from(projectTemplates).orderBy(desc(projectTemplates.createdAt));
  }

  async getProjectTemplate(id: number): Promise<ProjectTemplate | undefined> {
    const [template] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, id));
    return template;
  }

  async createProjectTemplate(template: InsertProjectTemplate, userId: string): Promise<ProjectTemplate> {
    const templateData = { ...template, createdBy: userId };
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
    await db.delete(projectTemplates).where(eq(projectTemplates.id, id));
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
    const interactionData = { ...interaction, createdBy: userId };
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
    const transcriptData = { ...transcript, createdBy: userId };
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
      .values(log)
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
}

export const storage = new DatabaseStorage();
