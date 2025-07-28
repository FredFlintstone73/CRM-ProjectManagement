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
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User access level enum
export const accessLevelEnum = pgEnum("access_level", [
  "team_member",
  "manager", 
  "administrator"
]);

// Invitation status enum
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired"
]);

// Contact types enum
export const contactTypeEnum = pgEnum("contact_type", [
  "client",
  "prospect", 
  "team_member",
  "strategic_partner",
  "trusted_professional"
]);

// Contact roles enum (for team members and strategic partners)
export const contactRoleEnum = pgEnum("contact_role", [
  "accountant",
  "admin_assistant",
  "client_service_member",
  "deliverables_team_coordinator",
  "estate_attorney",
  "financial_planner",
  "human_relations",
  "insurance_business",
  "insurance_health",
  "insurance_life_ltc_disability",
  "insurance_pc",
  "loan_officer",
  "marketing_director", 
  "money_manager",
  "strategic_relations_director",
  "tax_planner",
  "trusted_advisor",
  "other"
]);

// Contact status enum
export const contactStatusEnum = pgEnum("contact_status", [
  "active",
  "inactive",
  "follow_up",
  "converted"
]);

// Calendar provider enum
export const calendarProviderEnum = pgEnum("calendar_provider", [
  "google",
  "outlook",
  "apple",
  "other"
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
  accessLevel: accessLevelEnum("access_level").default("team_member"),
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  twoFactorSecret: varchar("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  backupCodes: jsonb("backup_codes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  
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
  businessPhone: varchar("business_phone"),
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
  
  // Business Information
  businessName: varchar("business_name"),
  businessAddressStreet1: varchar("business_address_street1"),
  businessAddressStreet2: varchar("business_address_street2"),
  businessAddressCity: varchar("business_address_city"),
  businessAddressState: varchar("business_address_state"),
  businessAddressZip: varchar("business_address_zip"),
  
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
  role: contactRoleEnum("role"), // Only for team_member and strategic_partner
  status: contactStatusEnum("status").default("active"),
  departments: text("departments").array().default([]),
  notes: text("notes"),
  applicationComplete: varchar("application_complete"),
  profileImageUrl: varchar("profile_image_url"),
  originalImageUrl: varchar("original_image_url"), // Store original uploaded image
  photoCropSettings: jsonb("photo_crop_settings").$type<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
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

// Milestones table - For organizing tasks within projects and templates
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  templateId: integer("template_id").references(() => projectTemplates.id),
  dueDate: timestamp("due_date"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Tasks table - Enhanced with hierarchy support
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  milestoneId: integer("milestone_id").references(() => milestones.id),
  parentTaskId: integer("parent_task_id").references(() => tasks.id),
  assignedTo: integer("assigned_to").array(), // Support multiple assignees
  assignedToRole: text("assigned_to_role").array(), // Support multiple role assignments
  status: taskStatusEnum("status").default("todo"),
  priority: integer("priority").default(25), // 1-50 priority scale
  dueDate: timestamp("due_date"),
  daysFromMeeting: integer("days_from_meeting").default(0), // Days offset from meeting date for templates
  dependsOnTaskId: integer("depends_on_task_id").references(() => tasks.id), // Task dependency for automatic due date calculation
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").default(0),
  level: integer("level").default(0), // 0 = parent, 1 = child, 2 = grandchild
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Task comments table
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  userId: varchar("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task files table
export const taskFiles = pgTable("task_files", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-specific task priorities table
export const userTaskPriorities = pgTable("user_task_priorities", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").references(() => contacts.id), // Links to the user's contact record
  priority: integer("priority").default(50), // 1-50 priority scale, default 50
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_task_priority_idx").on(table.userId, table.taskId),
  index("contact_task_priority_idx").on(table.contactId, table.taskId),
]);

// Project templates table - Enhanced with milestone support
export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  meetingType: varchar("meeting_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Email interactions table
export const emailInteractions = pgTable("email_interactions", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id),
  parentEmailId: integer("parent_email_id").references(() => emailInteractions.id),
  subject: varchar("subject"),
  body: text("body"),
  sender: varchar("sender"),
  recipient: varchar("recipient"),
  emailType: varchar("email_type").default("sent"), // 'sent', 'received', 'reply', 'forward'
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Call transcripts table
export const callTranscripts = pgTable("call_transcripts", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id),
  transcript: text("transcript"),
  duration: integer("duration"), // in seconds
  calledAt: timestamp("called_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"), // contact, project, task, etc.
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project comments table
export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact businesses table - For multiple business associations per contact
export const contactBusinesses = pgTable("contact_businesses", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  businessName: varchar("business_name"),
  businessAddressStreet1: varchar("business_address_street1"),
  businessAddressStreet2: varchar("business_address_street2"),
  businessAddressCity: varchar("business_address_city"),
  businessAddressState: varchar("business_address_state"),
  businessAddressZip: varchar("business_address_zip"),
  businessPhone: varchar("business_phone"),
  officeManagerName: varchar("office_manager_name"),
  businessEin: varchar("business_ein"),
  partnershipDetails: text("partnership_details"),
  sortOrder: integer("sort_order").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentions table - Tracks @mentions across all comment/note types
export const mentions = pgTable("mentions", {
  id: serial("id").primaryKey(),
  mentionedUserId: varchar("mentioned_user_id").notNull().references(() => users.id),
  mentionedByUserId: varchar("mentioned_by_user_id").notNull().references(() => users.id),
  sourceType: varchar("source_type").notNull(), // 'task_comment', 'contact_note', 'project_comment'
  sourceId: integer("source_id").notNull(), // ID of the comment/note
  contextText: text("context_text"), // Surrounding text for context
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email notifications table - Tracks unread received emails
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailInteractionId: integer("email_interaction_id").notNull().references(() => emailInteractions.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts),
  projects: many(projects),
  tasks: many(tasks),
  milestones: many(milestones),
  projectTemplates: many(projectTemplates),
  emailInteractions: many(emailInteractions),
  callTranscripts: many(callTranscripts),
  activityLog: many(activityLog),
  projectComments: many(projectComments),
  taskComments: many(taskComments),
  taskFiles: many(taskFiles),
  mentionsReceived: many(mentions, { relationName: "mentionsReceived" }),
  mentionsSent: many(mentions, { relationName: "mentionsSent" }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
  }),
  projects: many(projects),
  emailInteractions: many(emailInteractions),
  callTranscripts: many(callTranscripts),
  notes: many(contactNotes),
  businesses: many(contactBusinesses),
}));

export const contactBusinessesRelations = relations(contactBusinesses, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactBusinesses.contactId],
    references: [contacts.id],
  }),
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
  milestones: many(milestones),
  comments: many(projectComments),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
  }),
  subtasks: many(tasks),
  // Note: assignedTo is now an array, so we can't use simple one-to-one relations
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  comments: many(taskComments),
  files: many(taskFiles),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  template: one(projectTemplates, {
    fields: [milestones.templateId],
    references: [projectTemplates.id],
  }),
  createdBy: one(users, {
    fields: [milestones.createdBy],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const projectTemplatesRelations = relations(projectTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projectTemplates.createdBy],
    references: [users.id],
  }),
  milestones: many(milestones),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const taskFilesRelations = relations(taskFiles, ({ one }) => ({
  task: one(tasks, {
    fields: [taskFiles.taskId],
    references: [tasks.id],
  }),
  uploadedBy: one(users, {
    fields: [taskFiles.uploadedBy],
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

// Contact notes table
export const contactNotes = pgTable("contact_notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactNotesRelations = relations(contactNotes, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactNotes.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [contactNotes.userId],
    references: [users.id],
  }),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  mentionedUser: one(users, {
    fields: [mentions.mentionedUserId],
    references: [users.id],
    relationName: "mentionsReceived",
  }),
  mentionedByUser: one(users, {
    fields: [mentions.mentionedByUserId],
    references: [users.id],
    relationName: "mentionsSent",
  }),
}));

// Contact files table
export const contactFiles = pgTable("contact_files", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  fileUrl: varchar("file_url"),
  fileContent: text("file_content"), // Store base64 encoded file content
  isUrl: boolean("is_url").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactFilesRelations = relations(contactFiles, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactFiles.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [contactFiles.userId],
    references: [users.id],
  }),
}));

export const userTaskPrioritiesRelations = relations(userTaskPriorities, ({ one }) => ({
  task: one(tasks, {
    fields: [userTaskPriorities.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [userTaskPriorities.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [userTaskPriorities.contactId],
    references: [contacts.id],
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
  dateOfBirth: z.string().optional().nullable(),
  dateOfDeath: z.string().optional().nullable(),
  govIdExpiration: z.string().optional().nullable(),
  spouseDateOfBirth: z.string().optional().nullable(),
  spouseDateOfDeath: z.string().optional().nullable(),
  spouseGovIdExpiration: z.string().optional().nullable(),
  marriageDate: z.string().optional().nullable(),
  child1DateOfBirth: z.string().optional().nullable(),
  child1DateOfDeath: z.string().optional().nullable(),
  child2DateOfBirth: z.string().optional().nullable(),
  child2DateOfDeath: z.string().optional().nullable(),
  child3DateOfBirth: z.string().optional().nullable(),
  child3DateOfDeath: z.string().optional().nullable(),
  child4DateOfBirth: z.string().optional().nullable(),
  child4DateOfDeath: z.string().optional().nullable(),
  child5DateOfBirth: z.string().optional().nullable(),
  child5DateOfDeath: z.string().optional().nullable(),
  child6DateOfBirth: z.string().optional().nullable(),
  child6DateOfDeath: z.string().optional().nullable(),
  child7DateOfBirth: z.string().optional().nullable(),
  child7DateOfDeath: z.string().optional().nullable(),
  // Make all optional varchar fields nullable
  familyName: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  ssn: z.string().optional().nullable(),
  govIdType: z.string().optional().nullable(),
  govIdNumber: z.string().optional().nullable(),
  cellPhone: z.string().optional().nullable(),
  personalEmail: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  workEmail: z.string().optional().nullable(),
  spouseNickname: z.string().optional().nullable(),
  spouseSSN: z.string().optional().nullable(),
  spouseGovIdType: z.string().optional().nullable(),
  spouseGovIdNumber: z.string().optional().nullable(),
  spouseCellPhone: z.string().optional().nullable(),
  spousePersonalEmail: z.string().optional().nullable(),
  spouseWorkPhone: z.string().optional().nullable(),
  spouseWorkEmail: z.string().optional().nullable(),
  mailingAddressStreet1: z.string().optional().nullable(),
  mailingAddressStreet2: z.string().optional().nullable(),
  mailingAddressCity: z.string().optional().nullable(),
  mailingAddressState: z.string().optional().nullable(),
  mailingAddressZip: z.string().optional().nullable(),
  homeAddressStreet1: z.string().optional().nullable(),
  homeAddressStreet2: z.string().optional().nullable(),
  homeAddressCity: z.string().optional().nullable(),
  homeAddressState: z.string().optional().nullable(),
  homeAddressZip: z.string().optional().nullable(),
  vacationAddressStreet1: z.string().optional().nullable(),
  vacationAddressStreet2: z.string().optional().nullable(),
  vacationAddressCity: z.string().optional().nullable(),
  vacationAddressState: z.string().optional().nullable(),
  vacationAddressZip: z.string().optional().nullable(),
  child1FirstName: z.string().optional().nullable(),
  child1LastName: z.string().optional().nullable(),
  child2FirstName: z.string().optional().nullable(),
  child2LastName: z.string().optional().nullable(),
  child3FirstName: z.string().optional().nullable(),
  child3LastName: z.string().optional().nullable(),
  child4FirstName: z.string().optional().nullable(),
  child4LastName: z.string().optional().nullable(),
  child5FirstName: z.string().optional().nullable(),
  child5LastName: z.string().optional().nullable(),
  child6FirstName: z.string().optional().nullable(),
  child6LastName: z.string().optional().nullable(),
  child7FirstName: z.string().optional().nullable(),
  child7LastName: z.string().optional().nullable(),
  investmentName: z.string().optional().nullable(),
  investmentPhone: z.string().optional().nullable(),
  investmentEmail: z.string().optional().nullable(),
  taxName: z.string().optional().nullable(),
  taxPhone: z.string().optional().nullable(),
  taxEmail: z.string().optional().nullable(),
  estateAttyName: z.string().optional().nullable(),
  estateAttyPhone: z.string().optional().nullable(),
  estateAttyEmail: z.string().optional().nullable(),
  pncName: z.string().optional().nullable(),
  pncPhone: z.string().optional().nullable(),
  pncEmail: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  applicationComplete: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  // Handle string date inputs from forms
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  // Handle string date inputs from forms
  dueDate: z.string().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  createdBy: true,
}).extend({
  // Handle string date inputs from forms
  dueDate: z.string().optional().nullable(),
  // Handle assignment field as array of strings/numbers OR single string/number (will be converted server-side)
  assignedTo: z.union([
    z.array(z.union([z.string(), z.number()])),
    z.string(),
    z.number()
  ]).optional().nullable(),
  // Handle role-based assignment for templates as array OR single string
  assignedToRole: z.union([
    z.array(z.enum([
      "accountant",
      "admin_assistant",
      "client_service_member",
      "deliverables_team_coordinator",
      "estate_attorney",
      "financial_planner",
      "human_relations",
      "insurance_business",
      "insurance_health",
      "insurance_life_ltc_disability",
      "insurance_pc",
      "loan_officer",
      "marketing_director",
      "money_manager",
      "strategic_relations_director",
      "tax_planner",
      "trusted_advisor",
      "other"
    ])),
    z.enum([
      "accountant",
      "admin_assistant",
      "client_service_member",
      "deliverables_team_coordinator",
      "estate_attorney",
      "financial_planner",
      "human_relations",
      "insurance_business",
      "insurance_health",
      "insurance_life_ltc_disability",
      "insurance_pc",
      "loan_officer",
      "marketing_director",
      "money_manager",
      "strategic_relations_director",
      "tax_planner",
      "trusted_advisor",
      "other"
    ])
  ]).optional().nullable(),
  // Handle priority field as string that will be converted to number
  priority: z.union([z.string(), z.number()]).optional(),
  // Make description nullable for partial updates
  description: z.string().optional().nullable(),
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

// Email interactions relations (updated with thread support)
export const emailInteractionsRelations = relations(emailInteractions, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [emailInteractions.contactId],
    references: [contacts.id],
  }),
  parentEmail: one(emailInteractions, {
    fields: [emailInteractions.parentEmailId],
    references: [emailInteractions.id],
    relationName: "emailThread"
  }),
  replies: many(emailInteractions, {
    relationName: "emailThread"
  }),
  createdByUser: one(users, {
    fields: [emailInteractions.createdBy],
    references: [users.id],
  }),
}));

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

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactNoteSchema = createInsertSchema(contactNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const insertContactFileSchema = createInsertSchema(contactFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const insertTaskFileSchema = createInsertSchema(taskFiles).omit({
  id: true,
  createdAt: true,
  uploadedBy: true,
});

export const insertUserTaskPrioritySchema = createInsertSchema(userTaskPriorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactBusinessSchema = createInsertSchema(contactBusinesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User invitations table
export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  accessLevel: accessLevelEnum("access_level").notNull(),
  invitationCode: varchar("invitation_code").notNull().unique(),
  status: invitationStatusEnum("status").default("pending"),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invitation requests table - for people requesting invitations
export const invitationRequests = pgTable("invitation_requests", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  message: text("message"),
  status: varchar("status").default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar connections table
export const calendarConnections = pgTable("calendar_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: calendarProviderEnum("provider").notNull(),
  calendarId: varchar("calendar_id"), // External calendar ID
  calendarName: varchar("calendar_name"),
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  settings: jsonb("settings"), // Calendar-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("calendar_user_idx").on(table.userId),
  index("calendar_provider_idx").on(table.provider),
]);

// Relations
export const userRelations = relations(users, ({ many, one }) => ({
  invitations: many(userInvitations, { relationName: "userInvitations" }),
  invitedBy: one(users, { 
    fields: [users.invitedBy], 
    references: [users.id],
    relationName: "invitedUsers"
  })
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  invitedBy: one(users, { 
    fields: [userInvitations.invitedBy], 
    references: [users.id] 
  })
}));

export const invitationRequestsRelations = relations(invitationRequests, ({ one }) => ({
  reviewedBy: one(users, {
    fields: [invitationRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const calendarConnectionsRelations = relations(calendarConnections, ({ one }) => ({
  user: one(users, {
    fields: [calendarConnections.userId],
    references: [users.id],
  }),
}));

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  invitationCode: true,
  status: true,
  invitedAt: true,
  acceptedAt: true,
  invitedBy: true,
  expiresAt: true,
});

export const insertInvitationRequestSchema = createInsertSchema(invitationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertCalendarConnectionSchema = createInsertSchema(calendarConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
  lastSyncAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User activity tracking table
export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // login, logout, page_view, api_call, etc.
  resource: varchar("resource"), // page path, api endpoint, etc.
  details: jsonb("details"), // additional context like IP, user agent, etc.
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  timestamp: true,
});

export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskFile = typeof taskFiles.$inferSelect;
export type InsertTaskFile = z.infer<typeof insertTaskFileSchema>;
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
export type ContactNote = typeof contactNotes.$inferSelect;
export type InsertContactNote = z.infer<typeof insertContactNoteSchema>;
export type ContactFile = typeof contactFiles.$inferSelect;
export type InsertContactFile = z.infer<typeof insertContactFileSchema>;
export type UserTaskPriority = typeof userTaskPriorities.$inferSelect;
export type InsertUserTaskPriority = z.infer<typeof insertUserTaskPrioritySchema>;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;
export type ContactBusiness = typeof contactBusinesses.$inferSelect;
export type InsertContactBusiness = z.infer<typeof insertContactBusinessSchema>;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type InsertCalendarConnection = z.infer<typeof insertCalendarConnectionSchema>;

// Mentions schema and types
export const insertMentionSchema = createInsertSchema(mentions).omit({
  id: true,
  createdAt: true,
});

export type Mention = typeof mentions.$inferSelect;
export type InsertMention = z.infer<typeof insertMentionSchema>;

// Email notification types
export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  createdAt: true,
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;
