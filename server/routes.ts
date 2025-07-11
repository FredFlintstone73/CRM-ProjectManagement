import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertContactSchema, 
  insertProjectSchema, 
  insertTaskSchema,
  insertProjectTemplateSchema,
  insertEmailInteractionSchema,
  insertCallTranscriptSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/activity', isAuthenticated, async (req: any, res) => {
    try {
      const activity = await storage.getActivityLog();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ message: "Failed to fetch activity log" });
    }
  });

  // Contact routes
  app.get('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const { type, search } = req.query;
      let contacts;
      
      if (search) {
        contacts = await storage.searchContacts(search as string);
      } else if (type) {
        contacts = await storage.getContactsByType(type as string);
      } else {
        contacts = await storage.getContacts();
      }
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.getContact(parseInt(req.params.id));
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const contact = await storage.createContact(contactData, userId);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(parseInt(req.params.id), contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContact(parseInt(req.params.id));
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.query;
      let projects;
      
      if (clientId) {
        projects = await storage.getProjectsByClient(parseInt(clientId as string));
      } else {
        projects = await storage.getProjects();
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const project = await storage.createProject(projectData, userId);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(parseInt(req.params.id), projectData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProject(parseInt(req.params.id));
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, userId, upcoming, overdue } = req.query;
      let tasks;
      
      if (upcoming) {
        tasks = await storage.getUpcomingTasks();
      } else if (overdue) {
        tasks = await storage.getOverdueTasks();
      } else if (projectId) {
        tasks = await storage.getTasksByProject(parseInt(projectId as string));
      } else if (userId) {
        tasks = await storage.getTasksByUser(userId as string);
      } else {
        tasks = await storage.getTasks();
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const task = await storage.createTask(taskData, userId);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(parseInt(req.params.id), taskData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTask(parseInt(req.params.id));
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Project template routes
  app.get('/api/project-templates', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getProjectTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ message: "Failed to fetch project templates" });
    }
  });

  app.post('/api/project-templates', isAuthenticated, async (req: any, res) => {
    try {
      const templateData = insertProjectTemplateSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const template = await storage.createProjectTemplate(templateData, userId);
      res.json(template);
    } catch (error) {
      console.error("Error creating project template:", error);
      res.status(500).json({ message: "Failed to create project template" });
    }
  });

  // Email interaction routes
  app.get('/api/email-interactions', isAuthenticated, async (req: any, res) => {
    try {
      const { contactId } = req.query;
      let interactions;
      
      if (contactId) {
        interactions = await storage.getEmailInteractionsByContact(parseInt(contactId as string));
      } else {
        interactions = await storage.getEmailInteractions();
      }
      
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching email interactions:", error);
      res.status(500).json({ message: "Failed to fetch email interactions" });
    }
  });

  app.post('/api/email-interactions', isAuthenticated, async (req: any, res) => {
    try {
      const interactionData = insertEmailInteractionSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const interaction = await storage.createEmailInteraction(interactionData, userId);
      res.json(interaction);
    } catch (error) {
      console.error("Error creating email interaction:", error);
      res.status(500).json({ message: "Failed to create email interaction" });
    }
  });

  // Call transcript routes
  app.get('/api/call-transcripts', isAuthenticated, async (req: any, res) => {
    try {
      const { contactId } = req.query;
      let transcripts;
      
      if (contactId) {
        transcripts = await storage.getCallTranscriptsByContact(parseInt(contactId as string));
      } else {
        transcripts = await storage.getCallTranscripts();
      }
      
      res.json(transcripts);
    } catch (error) {
      console.error("Error fetching call transcripts:", error);
      res.status(500).json({ message: "Failed to fetch call transcripts" });
    }
  });

  app.post('/api/call-transcripts', isAuthenticated, async (req: any, res) => {
    try {
      const transcriptData = insertCallTranscriptSchema.parse(req.body);
      const userId = req.user.claims.sub;
      const transcript = await storage.createCallTranscript(transcriptData, userId);
      res.json(transcript);
    } catch (error) {
      console.error("Error creating call transcript:", error);
      res.status(500).json({ message: "Failed to create call transcript" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
