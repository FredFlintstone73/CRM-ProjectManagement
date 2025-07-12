import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact types enum
export const contactTypeEnum = pgEnum("contact_type", [
  "client",
  "prospect", 
  "team_member",
  "strategic_partner"
]);

// Contact status enum
export const contactStatusEnum = pgEnum("contact_status", [
  "active",
  "inactive",
  "follow_up",
  "converted"
]);

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled"
]);

// Project type enum
export const projectTypeEnum = pgEnum("project_type", [
  "frm", // Financial Road Map Interview
  "im",  // Implementation Meeting
  "ipu", // Initial Progress Update
  "csr", // Comprehensive Safety Review
  "gpo", // Goals Progress Update
  "tar"  // The Annual Review
]);

// Task status enum
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "completed",
  "cancelled"
]);

// Task priority enum
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);

// Contacts table
export const contacts = pgTable("contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  
  // Basic Information
  familyName: varchar("family_name"),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  nickname: varchar("nickname"),
  gender: varchar("gender"),
  ssn: varchar("ssn"),
  govIdType: varchar("gov_id_type"),
  govIdNumber: varchar("gov_id_number"),
  govIdExpiration: timestamp("gov_id_expiration"),
  dateOfBirth: timestamp("date_of_birth"),
  dateOfDeath: timestamp("date_of_death"),
  
  // Contact Information
  cellPhone: varchar("cell_phone"),
  personalEmail: varchar("personal_email"),
  workPhone: varchar("work_phone"),
  workEmail: varchar("work_email"),
  preferredContactMethod: varchar("preferred_contact_method"),
  
  // Spouse Information
  spouseFirstName: varchar("spouse_first_name"),
  spouseLastName: varchar("spouse_last_name"),
  spouseNickname: varchar("spouse_nickname"),
  spouseGender: varchar("spouse_gender"),
  spouseSSN: varchar("spouse_ssn"),
  spouseGovIdType: varchar("spouse_gov_id_type"),
  spouseGovIdNumber: varchar("spouse_gov_id_number"),
  spouseGovIdExpiration: timestamp("spouse_gov_id_expiration"),
  spouseDateOfBirth: timestamp("spouse_date_of_birth"),
  spouseDateOfDeath: timestamp("spouse_date_of_death"),
  marriageDate: timestamp("marriage_date"),
  
  // Spouse Contact Information
  spouseCellPhone: varchar("spouse_cell_phone"),
  spousePersonalEmail: varchar("spouse_personal_email"),
  spouseWorkPhone: varchar("spouse_work_phone"),
  spouseWorkEmail: varchar("spouse_work_email"),
  spousePreferredContactMethod: varchar("spouse_preferred_contact_method"),
  
  // Address Information
  mailingAddressStreet1: varchar("mailing_address_street1"),
  mailingAddressStreet2: varchar("mailing_address_street2"),
  mailingAddressCity: varchar("mailing_address_city"),
  mailingAddressState: varchar("mailing_address_state"),
  mailingAddressZip: varchar("mailing_address_zip"),
  homeAddressStreet1: varchar("home_address_street1"),
  homeAddressStreet2: varchar("home_address_street2"),
  homeAddressCity: varchar("home_address_city"),
  homeAddressState: varchar("home_address_state"),
  homeAddressZip: varchar("home_address_zip"),
  sameAsMailingAddress: varchar("same_as_mailing_address"),
  
  // Vacation Home Address Information
  vacationAddressStreet1: varchar("vacation_address_street1"),
  vacationAddressStreet2: varchar("vacation_address_street2"),
  vacationAddressCity: varchar("vacation_address_city"),
  vacationAddressState: varchar("vacation_address_state"),
  vacationAddressZip: varchar("vacation_address_zip"),
  
  // Children Information (up to 7 children)
  child1FirstName: varchar("child1_first_name"),
  child1LastName: varchar("child1_last_name"),
  child1Gender: varchar("child1_gender"),
  child1DateOfBirth: timestamp("child1_date_of_birth"),
  child1DateOfDeath: timestamp("child1_date_of_death"),
  child2FirstName: varchar("child2_first_name"),
  child2LastName: varchar("child2_last_name"),
  child2Gender: varchar("child2_gender"),
  child2DateOfBirth: timestamp("child2_date_of_birth"),
  child2DateOfDeath: timestamp("child2_date_of_death"),
  child3FirstName: varchar("child3_first_name"),
  child3LastName: varchar("child3_last_name"),
  child3Gender: varchar("child3_gender"),
  child3DateOfBirth: timestamp("child3_date_of_birth"),
  child3DateOfDeath: timestamp("child3_date_of_death"),
  child4FirstName: varchar("child4_first_name"),
  child4LastName: varchar("child4_last_name"),
  child4Gender: varchar("child4_gender"),
  child4DateOfBirth: timestamp("child4_date_of_birth"),
  child4DateOfDeath: timestamp("child4_date_of_death"),
  child5FirstName: varchar("child5_first_name"),
  child5LastName: varchar("child5_last_name"),
  child5Gender: varchar("child5_gender"),
  child5DateOfBirth: timestamp("child5_date_of_birth"),
  child5DateOfDeath: timestamp("child5_date_of_death"),
  child6FirstName: varchar("child6_first_name"),
  child6LastName: varchar("child6_last_name"),
  child6Gender: varchar("child6_gender"),
  child6DateOfBirth: timestamp("child6_date_of_birth"),
  child6DateOfDeath: timestamp("child6_date_of_death"),
  child7FirstName: varchar("child7_first_name"),
  child7LastName: varchar("child7_last_name"),
  child7Gender: varchar("child7_gender"),
  child7DateOfBirth: timestamp("child7_date_of_birth"),
  child7DateOfDeath: timestamp("child7_date_of_death"),
  
  // Professional Contacts
  investmentName: varchar("investment_name"),
  investmentEmail: varchar("investment_email"),
  investmentPhone: varchar("investment_phone"),
  taxName: varchar("tax_name"),
  taxEmail: varchar("tax_email"),
  taxPhone: varchar("tax_phone"),
  estateAttyName: varchar("estate_atty_name"),
  estateAttyEmail: varchar("estate_atty_email"),
  estateAttyPhone: varchar("estate_atty_phone"),
  pncName: varchar("pnc_name"),
  pncEmail: varchar("pnc_email"),
  pncPhone: varchar("pnc_phone"),
  lifeInsName: varchar("life_ins_name"),
  lifeInsEmail: varchar("life_ins_email"),
  lifeInsPhone: varchar("life_ins_phone"),
  otherName: varchar("other_name"),
  otherEmail: varchar("other_email"),
  otherPhone: varchar("other_phone"),
  
  // System fields
  contactType: contactTypeEnum("contact_type").notNull(),
  status: contactStatusEnum("status").default("active"),
  notes: text("notes"),
  applicationComplete: varchar("application_complete"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Projects table
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => contacts.id),
  status: projectStatusEnum("status").default("planning"),
  projectType: projectTypeEnum("project_type").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  dueDate: timestamp("due_date"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: taskStatusEnum("status").default("todo"),
  priority: taskPriorityEnum("priority").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Project templates table
export const projectTemplates = pgTable("project_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull(),
  description: text("description"),
  tasks: jsonb("tasks"), // Array of task templates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Email interactions table
export const emailInteractions = pgTable("email_interactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contactId: integer("contact_id").references(() => contacts.id),
  subject: varchar("subject"),
  body: text("body"),
  sender: varchar("sender"),
  recipient: varchar("recipient"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Call transcripts table
export const callTranscripts = pgTable("call_transcripts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contactId: integer("contact_id").references(() => contacts.id),
  transcript: text("transcript"),
  duration: integer("duration"), // in seconds
  calledAt: timestamp("called_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"), // contact, project, task, etc.
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project comments table
export const projectComments = pgTable("project_comments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts),
  projects: many(projects),
  tasks: many(tasks),
  projectTemplates: many(projectTemplates),
  emailInteractions: many(emailInteractions),
  callTranscripts: many(callTranscripts),
  activityLog: many(activityLog),
  projectComments: many(projectComments),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
  }),
  projects: many(projects),
  emailInteractions: many(emailInteractions),
  callTranscripts: many(callTranscripts),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(contacts, {
    fields: [projects.clientId],
    references: [contacts.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  tasks: many(tasks),
  comments: many(projectComments),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
}));

export const projectTemplatesRelations = relations(projectTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [projectTemplates.createdBy],
    references: [users.id],
  }),
}));

export const emailInteractionsRelations = relations(emailInteractions, ({ one }) => ({
  contact: one(contacts, {
    fields: [emailInteractions.contactId],
    references: [contacts.id],
  }),
  createdBy: one(users, {
    fields: [emailInteractions.createdBy],
    references: [users.id],
  }),
}));

export const callTranscriptsRelations = relations(callTranscripts, ({ one }) => ({
  contact: one(contacts, {
    fields: [callTranscripts.contactId],
    references: [contacts.id],
  }),
  createdBy: one(users, {
    fields: [callTranscripts.createdBy],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const projectCommentsRelations = relations(projectComments, ({ one }) => ({
  project: one(projects, {
    fields: [projectComments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectComments.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  // Make date fields optional and handle string inputs
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  govIdExpiration: z.string().optional(),
  spouseDateOfBirth: z.string().optional(),
  spouseDateOfDeath: z.string().optional(),
  spouseGovIdExpiration: z.string().optional(),
  marriageDate: z.string().optional(),
  child1DateOfBirth: z.string().optional(),
  child1DateOfDeath: z.string().optional(),
  child2DateOfBirth: z.string().optional(),
  child2DateOfDeath: z.string().optional(),
  child3DateOfBirth: z.string().optional(),
  child3DateOfDeath: z.string().optional(),
  child4DateOfBirth: z.string().optional(),
  child4DateOfDeath: z.string().optional(),
  child5DateOfBirth: z.string().optional(),
  child5DateOfDeath: z.string().optional(),
  child6DateOfBirth: z.string().optional(),
  child6DateOfDeath: z.string().optional(),
  child7DateOfBirth: z.string().optional(),
  child7DateOfDeath: z.string().optional(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailInteractionSchema = createInsertSchema(emailInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertCallTranscriptSchema = createInsertSchema(callTranscripts).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type EmailInteraction = typeof emailInteractions.$inferSelect;
export type InsertEmailInteraction = z.infer<typeof insertEmailInteractionSchema>;
export type CallTranscript = typeof callTranscripts.$inferSelect;
export type InsertCallTranscript = z.infer<typeof insertCallTranscriptSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
