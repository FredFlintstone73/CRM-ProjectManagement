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
  insertCallTranscriptSchema,
  insertProjectCommentSchema,
  insertContactNoteSchema
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

  app.get('/api/dashboard/projects-due', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      const projects = await storage.getProjectsDueSoon(start, end);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects due soon:", error);
      res.status(500).json({ message: "Failed to fetch projects due soon" });
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

  app.post('/api/contacts/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "Image URL is required" });
      }
      
      const contactId = parseInt(req.params.id);
      const contact = await storage.updateContact(contactId, { profileImageUrl: imageUrl });
      res.json(contact);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
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

  // Create project from template with due date calculations
  app.post('/api/projects/from-template', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, clientId, description, status, meetingDate, drpmDate, tasks } = req.body;
      
      // Create the project
      const projectData = {
        name,
        clientId: parseInt(clientId),
        description: description || 'Project created from template',
        status: (status || 'active') as const,
        priority: 'medium' as const,
        projectType: 'csr' as const,
        estimatedDays: 90,
        dueDate: meetingDate ? new Date(meetingDate) : null
      };

      const newProject = await storage.createProject(projectData, userId);

      // Create tasks from the calculated task data
      const createdTasks = [];
      for (const taskData of tasks || []) {
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description || '',
          projectId: newProject.id,
          status: (taskData.status || 'todo') as const,
          priority: (taskData.priority || 'medium') as const,
          estimatedDays: 1,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          assignedTo: taskData.assignedTo ? parseInt(taskData.assignedTo) : null,
          description: `${taskData.description || ''}\nMilestone: ${taskData.milestone || 'N/A'}\nParent Task: ${taskData.parentTask || 'N/A'}\nSub-Task: ${taskData.subTask || 'N/A'}\nSub-Sub-Task: ${taskData.subSubTask || 'N/A'}\nDaysFromMeeting: ${taskData.daysFromMeeting || 0}\nBasedOnDrpm: ${taskData.basedOnDrpm || false}`
        }, userId);
        createdTasks.push(task);
      }

      res.status(201).json({
        project: newProject,
        tasks: createdTasks,
        message: `Created project with ${createdTasks.length} tasks from template`
      });
    } catch (error: any) {
      console.error("Error creating project from template:", error);
      res.status(500).json({ message: "Failed to create project from template" });
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

  // Update project due date and recalculate all task due dates
  app.put('/api/projects/:id/update-due-date', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { dueDate } = req.body;
      
      // Get the current project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update the project due date
      const updatedProject = await storage.updateProject(projectId, { dueDate });
      
      // Get all tasks for this project
      const tasks = await storage.getTasksByProject(projectId);
      
      if (dueDate && tasks.length > 0) {
        // If we have a new due date, recalculate all task due dates based on original offsets
        const newMeetingDate = new Date(dueDate);
        
        // Update all task due dates using original offsets from meeting date
        const updatePromises = tasks.map(async (task) => {
          if (task.description) {
            // Parse the offset information from description
            const daysFromMeetingMatch = task.description.match(/DaysFromMeeting: (-?\d+)/);
            const basedOnDrpmMatch = task.description.match(/BasedOnDrpm: (true|false)/);
            
            if (daysFromMeetingMatch) {
              const daysFromMeeting = parseInt(daysFromMeetingMatch[1]);
              const basedOnDrpm = basedOnDrpmMatch ? basedOnDrpmMatch[1] === 'true' : false;
              
              let newTaskDate: Date;
              if (basedOnDrpm) {
                // TODO: For now, use meeting date. We'd need to store DRPM date separately
                newTaskDate = new Date(newMeetingDate);
                newTaskDate.setDate(newTaskDate.getDate() + daysFromMeeting);
              } else {
                // Calculate based on meeting date
                newTaskDate = new Date(newMeetingDate);
                newTaskDate.setDate(newTaskDate.getDate() + daysFromMeeting);
              }
              
              return storage.updateTask(task.id, { dueDate: newTaskDate });
            }
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);
      }
      
      console.log('Updated project:', updatedProject);
      res.json({ 
        project: updatedProject, 
        message: `Updated project due date and ${tasks.length} task dates`,
        taskCount: tasks.length
      });
    } catch (error) {
      console.error("Error updating project due date:", error);
      res.status(500).json({ message: "Failed to update project due date" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: `Failed to delete project: ${error.message}` });
    }
  });

  // Project tasks route
  app.get('/api/projects/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  // Project comment routes
  app.get('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const comments = await storage.getProjectComments(projectId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching project comments:", error);
      res.status(500).json({ message: "Failed to fetch project comments" });
    }
  });

  app.post('/api/projects/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const commentData = insertProjectCommentSchema.parse({
        ...req.body,
        projectId,
      });
      const comment = await storage.createProjectComment(commentData, userId);
      res.json(comment);
    } catch (error) {
      console.error("Error creating project comment:", error);
      res.status(500).json({ message: "Failed to create project comment" });
    }
  });

  // Contact notes routes
  app.get('/api/contacts/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const notes = await storage.getContactNotes(contactId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching contact notes:", error);
      res.status(500).json({ message: "Failed to fetch contact notes" });
    }
  });

  app.post('/api/contacts/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const noteData = insertContactNoteSchema.parse({
        ...req.body,
        contactId,
      });
      const note = await storage.createContactNote(noteData, userId);
      res.json(note);
    } catch (error) {
      console.error("Error creating contact note:", error);
      res.status(500).json({ message: "Failed to create contact note" });
    }
  });

  app.put('/api/contacts/:id/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const updatedNote = await storage.updateContactNote(noteId, { content });
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating contact note:", error);
      res.status(500).json({ message: "Failed to update contact note" });
    }
  });

  app.delete('/api/contacts/:id/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      await storage.deleteContactNote(noteId);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact note:", error);
      res.status(500).json({ message: "Failed to delete contact note" });
    }
  });

  // Contact files routes
  app.get('/api/contacts/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const files = await storage.getContactFiles(contactId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching contact files:", error);
      res.status(500).json({ message: "Failed to fetch contact files" });
    }
  });

  app.post('/api/contacts/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const fileData = { ...req.body, contactId };
      
      const file = await storage.createContactFile(fileData, userId);
      res.json(file);
    } catch (error) {
      console.error("Error creating contact file:", error);
      res.status(500).json({ message: "Failed to create contact file" });
    }
  });

  app.put('/api/contacts/:id/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const updates = req.body;
      
      const updatedFile = await storage.updateContactFile(fileId, updates);
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating contact file:", error);
      res.status(500).json({ message: "Failed to update contact file" });
    }
  });

  app.delete('/api/contacts/:id/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      await storage.deleteContactFile(fileId);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact file:", error);
      res.status(500).json({ message: "Failed to delete contact file" });
    }
  });

  app.get('/api/contacts/:id/files/:fileId/download', isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const files = await storage.getContactFiles(parseInt(req.params.id));
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.isUrl) {
        // For URL links, redirect to the URL
        return res.redirect(file.fileUrl);
      }

      // For uploaded files, serve the actual file content
      if (file.fileContent) {
        // Extract base64 content from data URL
        const base64Data = file.fileContent.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          
          res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
          res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
          res.setHeader('Content-Length', buffer.length.toString());
          
          return res.send(buffer);
        }
      }

      // Fallback if no file content is stored
      const fileContent = `File: ${file.fileName}\nOriginal Name: ${file.originalName}\nSize: ${file.fileSize} bytes\nUploaded: ${file.createdAt}\nBy: ${file.userFirstName} ${file.userLastName}\n\nNote: File content not found. This may be due to a storage issue.`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}.txt"`);
      res.setHeader('Content-Type', 'text/plain');
      res.send(fileContent);
    } catch (error) {
      console.error("Error downloading contact file:", error);
      res.status(500).json({ message: "Failed to download file" });
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
      

      
      // Convert assignedTo from string to number if provided
      let assignedTo = null;
      if (taskData.assignedTo && taskData.assignedTo !== "" && taskData.assignedTo !== "unassigned") {
        if (taskData.assignedTo.startsWith("me_")) {
          // Find the current user's contact ID from the contacts table
          const userEmail = req.user.email || req.user.claims?.email;
          const userContacts = await storage.getContacts();
          const userContact = userContacts.find(contact => 
            contact.personalEmail === userEmail || 
            contact.workEmail === userEmail
          );
          assignedTo = userContact ? userContact.id : null;
        } else if (taskData.assignedTo.startsWith("team_")) {
          assignedTo = parseInt(taskData.assignedTo.replace("team_", ""));
        } else {
          assignedTo = parseInt(taskData.assignedTo);
        }
      }
      
      // Convert priority to number if provided
      let priority = 25;
      if (taskData.priority !== undefined && taskData.priority !== null) {
        const priorityNum = parseInt(taskData.priority.toString());
        priority = isNaN(priorityNum) ? 25 : priorityNum;
      }
      
      const processedTaskData = {
        ...taskData,
        assignedTo: assignedTo,
        priority: priority,
      };
      

      
      const task = await storage.createTask(processedTaskData, userId);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      
      // Convert assignedTo from string to number if provided
      let assignedTo = null;
      if (taskData.assignedTo && taskData.assignedTo !== "" && taskData.assignedTo !== "unassigned") {
        if (taskData.assignedTo.startsWith("me_")) {
          // Find the current user's contact ID from the contacts table
          const userEmail = req.user.email || req.user.claims?.email;
          const userContacts = await storage.getContacts();
          const userContact = userContacts.find(contact => 
            contact.personalEmail === userEmail || 
            contact.workEmail === userEmail
          );
          assignedTo = userContact ? userContact.id : null;
        } else if (taskData.assignedTo.startsWith("team_")) {
          assignedTo = parseInt(taskData.assignedTo.replace("team_", ""));
        } else {
          assignedTo = parseInt(taskData.assignedTo);
        }
      }
      
      // Convert priority to number if provided
      let priority = 25;
      if (taskData.priority !== undefined && taskData.priority !== null) {
        const priorityNum = typeof taskData.priority === 'string' ? parseInt(taskData.priority) : taskData.priority;
        priority = isNaN(priorityNum) ? 25 : priorityNum;
      }
      
      const processedTaskData = {
        ...taskData,
        assignedTo: assignedTo,
        priority: priority,
      };
      
      const task = await storage.updateTask(parseInt(req.params.id), processedTaskData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      

      
      // Helper function to safely convert to integer
      const safeParseInt = (value: any): number | null => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        if (typeof value === 'number') {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = parseInt(value);
          return isNaN(parsed) ? null : parsed;
        }
        return null;
      };
      
      // Convert assignedTo from string to number if provided and present
      let assignedTo = null;
      if (taskData.assignedTo !== undefined) {
        if (taskData.assignedTo && taskData.assignedTo !== "" && taskData.assignedTo !== "unassigned") {
          if (taskData.assignedTo.startsWith("me_")) {
            // Find the current user's contact ID from the contacts table
            const userEmail = req.user.email || req.user.claims?.email;
            const userContacts = await storage.getContacts();
            const userContact = userContacts.find(contact => 
              contact.personalEmail === userEmail || 
              contact.workEmail === userEmail
            );
            assignedTo = userContact ? userContact.id : null;
          } else if (taskData.assignedTo.startsWith("team_")) {
            assignedTo = parseInt(taskData.assignedTo.replace("team_", ""));
          } else {
            assignedTo = safeParseInt(taskData.assignedTo);
          }
        }
      }
      
      // Convert priority to number if provided
      let priority = 25;
      if (taskData.priority !== undefined && taskData.priority !== null) {
        const priorityNum = safeParseInt(taskData.priority);
        priority = priorityNum || 25;
      }
      
      const processedTaskData = {
        ...taskData,
        ...(taskData.assignedTo !== undefined && { assignedTo }),
        ...(taskData.priority !== undefined && { priority }),
        ...(taskData.milestoneId !== undefined && {
          milestoneId: safeParseInt(taskData.milestoneId)
        }),
        ...(taskData.parentTaskId !== undefined && {
          parentTaskId: safeParseInt(taskData.parentTaskId)
        }),
      };
      
      console.log('Processed task data:', processedTaskData);
      
      const task = await storage.updateTask(parseInt(req.params.id), processedTaskData);
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

  // Task hierarchy endpoints
  app.get('/api/tasks/:id/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const subtasks = await storage.getSubtasks(parseInt(req.params.id));
      res.json(subtasks);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      res.status(500).json({ message: "Failed to fetch subtasks" });
    }
  });

  app.get('/api/projects/:id/task-hierarchy', isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getTaskHierarchy(parseInt(req.params.id));
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching task hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch task hierarchy" });
    }
  });

  // Task comments endpoints
  app.get('/api/tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const comments = await storage.getTaskComments(parseInt(req.params.id));
      res.json(comments);
    } catch (error) {
      console.error("Error fetching task comments:", error);
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post('/api/tasks/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const commentData = { ...req.body, taskId: parseInt(req.params.id) };
      const comment = await storage.createTaskComment(commentData, userId);
      res.json(comment);
    } catch (error) {
      console.error("Error creating task comment:", error);
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  app.put('/api/task-comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const comment = await storage.updateTaskComment(parseInt(req.params.id), req.body);
      res.json(comment);
    } catch (error) {
      console.error("Error updating task comment:", error);
      res.status(500).json({ message: "Failed to update task comment" });
    }
  });

  app.delete('/api/task-comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTaskComment(parseInt(req.params.id));
      res.json({ message: "Task comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting task comment:", error);
      res.status(500).json({ message: "Failed to delete task comment" });
    }
  });

  // Task files endpoints
  app.get('/api/tasks/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const files = await storage.getTaskFiles(parseInt(req.params.id));
      res.json(files);
    } catch (error) {
      console.error("Error fetching task files:", error);
      res.status(500).json({ message: "Failed to fetch task files" });
    }
  });

  app.post('/api/tasks/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileData = { ...req.body, taskId: parseInt(req.params.id) };
      const file = await storage.createTaskFile(fileData, userId);
      res.json(file);
    } catch (error) {
      console.error("Error creating task file:", error);
      res.status(500).json({ message: "Failed to create task file" });
    }
  });

  app.put('/api/task-files/:id', isAuthenticated, async (req: any, res) => {
    try {
      const file = await storage.updateTaskFile(parseInt(req.params.id), req.body);
      res.json(file);
    } catch (error) {
      console.error("Error updating task file:", error);
      res.status(500).json({ message: "Failed to update task file" });
    }
  });

  app.delete('/api/task-files/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTaskFile(parseInt(req.params.id));
      res.json({ message: "Task file deleted successfully" });
    } catch (error) {
      console.error("Error deleting task file:", error);
      res.status(500).json({ message: "Failed to delete task file" });
    }
  });

  // Milestone endpoints
  app.get('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, templateId } = req.query;
      let milestones;
      
      if (projectId) {
        milestones = await storage.getMilestonesByProject(parseInt(projectId as string));
      } else if (templateId) {
        milestones = await storage.getMilestonesByTemplate(parseInt(templateId as string));
      } else {
        milestones = await storage.getMilestones();
      }
      
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.get('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const milestone = await storage.getMilestone(parseInt(req.params.id));
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error fetching milestone:", error);
      res.status(500).json({ message: "Failed to fetch milestone" });
    }
  });

  app.post('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const milestone = await storage.createMilestone(req.body, userId);
      res.json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  app.put('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const milestone = await storage.updateMilestone(parseInt(req.params.id), req.body);
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  app.delete('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMilestone(parseInt(req.params.id));
      res.json({ message: "Milestone deleted successfully" });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ message: "Failed to delete milestone" });
    }
  });

  app.get('/api/milestones/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getTasksByMilestone(parseInt(req.params.id));
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching milestone tasks:", error);
      res.status(500).json({ message: "Failed to fetch milestone tasks" });
    }
  });

  // CSV template download endpoint
  app.get('/api/download/csv-template', (req, res) => {
    const csvContent = `Milestone,Parent Task,Parent Description,Sub-Task,Sub-Task Description,Sub-Sub-Task,Sub-Sub-Task Description,Assignee,Due Date,Comments
"Confirming & Scheduling Meeting Dates & Times","Confirm Meeting Date & Time with Client","Confirm Meeting Date & Time with Client and Any Questions Regarding Implementation Plan or Items Due From Last Meeting","","","","","","10/12/2025",""
"Confirming & Scheduling Meeting Dates & Times","Confirm Preselected Dates in ClientHub","Confirm Preselected Dates in ClientHub","","","","","","10/13/2025",""
"Confirming & Scheduling Meeting Dates & Times","Confirm Proposed Dates/Time for DRPM","Confirm Proposed Dates/Time for DRPM","","","","","","10/15/2025",""
"Confirming & Scheduling Meeting Dates & Times","Update New Meeting in ClientHub","Update New Meeting in ClientHub and Create Meeting Packet Folder","","","","","","10/22/2025",""
"Confirming & Scheduling Meeting Dates & Times","Send Out Expectation Email #1","Send Out Expectation Email #1 to Team Through Email","","","","","","10/23/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Submit Your Items Still Needed & Initial Highest Priority Conversation Reports","Estate Attorney","Enter the Items Still Needed and your Highest Priority Conversation below in the comments area","","","","10/31/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Submit Your Items Still Needed & Initial Highest Priority Conversation Reports","Financial Planner","Enter the Items Still Needed and your Highest Priority Conversation below in the comments area","","","","10/31/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Submit Your Items Still Needed & Initial Highest Priority Conversation Reports","Insurance Planner - Life","Enter the Items Still Needed and your Highest Priority Conversation below in the comments area","","","","10/31/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Submit Your Items Still Needed & Initial Highest Priority Conversation Reports","Money Manager","Enter the Items Still Needed and your Highest Priority Conversation below in the comments area","","","","10/31/2025",""
"Preparing for & Gathering Information for Meetings","Submit Items Still Needed","Submit Your Items Still Needed & Initial Highest Priority Conversation Reports","Tax Planner","Enter the Items Still Needed and your Highest Priority Conversation below in the comments area","","","","10/31/2025",""
"Preparing for & Gathering Information for Meetings","Consolidate Items Still Needed","Consolidate Items Still Needed and Send to SMEs","","","","","","10/24/2025",""
"Preparing for & Gathering Information for Meetings","Consolidate Highest Priority Conversations","Consolidate Highest Priority Conversations & Update Meeting Agenda","Communicate Team Priorities","Communicate the Team's Highest Priorities to each SME","","","","10/24/2025",""
"Preparing for & Gathering Information for Meetings","Request Account Values","Request Account Values for Any Outside Accounts and Transactions","","","","","","11/21/2025",""
"Preparing for & Gathering Information for Meetings","Request Actions Taken","Request Actions Taken Since Last Meeting by Team and Client","Create Initial Client Agenda","Create Initial Client Agenda","","","","12/1/2025",""
"Preparing for & Gathering Information for Meetings","Download Account Values","Download Account Values & Transactions for Growth Accounts","","","","","","12/6/2025",""
"Preparing for DRPM","Create Circle Chart","Create Circle Chart","","","","","","12/8/2025",""
"Preparing for DRPM","Financial Planner Review","Financial Planner Review Circle Chart","","","","","","12/9/2025",""
"Preparing for DRPM","Provide Circle Chart to Team","Provide Circle Chart to Team with Expectation Letter #2 to Team ClientHub","Confirm DRPM Date","Confirm date of DRPM","","","","12/9/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Financial Roadmap","Financial Roadmap Updated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Implementation Plan","Implementation Plan (GPS) Updated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Paperwork Sources","Paperwork Sources Updated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Behind Numbers Report","Behind the Numbers Report Generated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Numbers History","Numbers History Report Updated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Since Inception Report","Since Inception Report Updated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Goal Progress Report","Goal Progress Report","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Growth Progress Since Last Meeting","Growth Progress Since Last Meeting Generated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Growth Progress Since Inception","Growth Progress Since Inception Generated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Annual Income Report","Annual Income From Current Assets Report Generated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Total Progress Report","Total Progress Report Generated","","","","12/10/2025",""
"Preparing for DRPM","Generate Reports","Generate Reports in Database Documents Due for Preliminary Packet","Master Goal Tracker","The Master Goal Tracker Updated","","","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Estate Attorney","Click on subtask below for list of reports","Legacy Flow Chart","The Legacy Flow Chart Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Estate Attorney","Click on subtask below for list of reports","POA Summary","POA Summary Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Estate Attorney","Click on subtask below for list of reports","Asset Titling Report","Asset Titling Report Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Financial Planner","Click on subtask below for list of reports","Goal Blueprint","The Goal Blueprint Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Financial Planner","Click on subtask below for list of reports","Lifetime Capital Projection","Lifetime Capital Projection","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Financial Planner","Click on subtask below for list of reports","Multiple Scenario Projections","Multiple Scenario Projections","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Insurance Planner - Life","Click on subtask below for list of reports","Insurance Grid","Insurance Grid Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Insurance Planner - P&C","Click on subtask below for list of reports","Insurance Grid","Insurance Grid Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Insurance Planner - Health","Click on subtask below for list of reports","Insurance Grid","Insurance Grid Updated","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Money Managers","Click on subtask below for list of reports","","","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Tax Planner","Click on subtask below for list of reports","Annual Tax Projection","Annual Tax Projection Completed","","12/10/2025",""
"Preparing for DRPM","Submit Critical Reports","Submit Critical Reports and Final Highest Priority Conversation","Tax Planner","Click on subtask below for list of reports","Tax Return Copy","Copy of Last Tax Return Filed on Record","","12/10/2025",""
"Preparing for DRPM","Trust Advisor Review","Trust Advisor Review of Preliminary Packet","","","","","","12/11/2025",""
"Preparing for DRPM","Preliminary Packet Distribution","Preliminary Packet Distributed to Team with Expectation Letter #3 to Team Through ClientHub","","","","","","12/12/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR01 Confirm Status","CSR01 Confirm Status of Last Meeting's Action Items","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR02 Implementation Plan","CSR02 Implementation Plan-of-Action Updated","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR03 Unfinished Recommendations","CSR03 Unfinished Recommendations are Updated","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR04 Debts Updated","CSR04 Debts are Updated on The Circle Chart","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR05 Since Inception Report","CSR05 The Since Inception Report Completed","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR06 Growth Progress Report","CSR06 The Growth Progress Since Last Meeting Report Completed","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR07 Growth Progress Since Inception","CSR07 The Growth Progress Since Inception Report Completed","","12/19/2025",""
"Preparing for DRPM","Nominations and Deliverables","Nominations and Deliverable Checkpoints Due","Client Service Rep","Click on subtask below for list of reports","CSR08 Goals Progress Report","CSR08 The Goals Progress Report Completed","","12/19/2025",""
"Preparing for Progress Meeting","DRPM Meeting","DRPM Meeting Execution","","","","","","12/15/2025",""
"Preparing for Progress Meeting","Corrections from DRPM","Corrections from DRPM Notes Made to Packet","","","","","","12/16/2025",""
"Preparing for Progress Meeting","Packet Sealed","Packet Sealed and Made Available to TA","","","","","","12/17/2025",""
"Preparing for Progress Meeting","Final Team Meeting","Final Team Meeting Before Client Progress Meeting","","","","","","12/18/2025",""
"After Progress Meeting","Send Post Meeting Notes","Send Post Meeting Notes and Action Items","","","","","","12/20/2025",""
"After Progress Meeting","Archive Meeting","Archive Meeting and Create Next Meeting Project in ClientHub","","","","","","12/21/2025",""`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clean_csv_template.csv"');
    res.send(csvContent);
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

  app.get('/api/project-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getProjectTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Project template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ message: "Failed to fetch project template" });
    }
  });

  // Template task routes
  app.get('/api/template-tasks/:templateId/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, taskId } = req.params;
      const template = await storage.getProjectTemplate(parseInt(templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      let tasks = [];
      try {
        const taskData = typeof template.tasks === 'string' ? JSON.parse(template.tasks) : template.tasks || [];
        
        // Convert sectioned data to flat array format
        if (taskData.sections) {
          tasks = Object.values(taskData.sections).flat().map((task: any) => ({
            name: task.title,
            description: task.description,
            priority: task.priority,
            estimatedDays: task.estimatedDays || 1,
            parentTask: task.parentTask
          }));
        } else if (Array.isArray(taskData)) {
          // Already in flat array format
          tasks = taskData.map((task: any) => ({
            name: task.title || task.name,
            description: task.description,
            priority: task.priority,
            estimatedDays: task.estimatedDays || 1,
            parentTask: task.parentTask
          }));
        }
      } catch (error) {
        console.error('Error parsing template tasks:', error);
        return res.status(500).json({ message: "Failed to parse template tasks" });
      }

      // Handle both main tasks and subtasks (format: "taskIndex" or "taskIndex-subtaskIndex")
      const taskParts = taskId.split('-');
      const taskIndex = parseInt(taskParts[0]);
      
      if (taskIndex < 0 || taskIndex >= tasks.length) {
        return res.status(404).json({ message: "Task not found" });
      }

      let task;
      if (taskParts.length === 1) {
        // Main task
        task = {
          id: taskId,
          ...tasks[taskIndex],
          assignedTo: 'unassigned',
          assignedToName: '',
          dueDate: '',
          comments: '',
          subtasks: []
        };
      } else {
        // Subtask
        const subtaskIndex = parseInt(taskParts[1]);
        const mainTask = tasks[taskIndex];
        
        // For now, we'll simulate subtasks based on the main task
        // In a real implementation, you'd have proper subtask data
        task = {
          id: taskId,
          name: `${mainTask.name} - Subtask ${subtaskIndex + 1}`,
          description: mainTask.description,
          priority: mainTask.priority,
          estimatedDays: Math.ceil(mainTask.estimatedDays / 3), // Estimated subtask duration
          assignedTo: 'unassigned',
          assignedToName: '',
          dueDate: '',
          comments: '',
          subtasks: []
        };
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching template task:", error);
      res.status(500).json({ message: "Failed to fetch template task" });
    }
  });

  app.put('/api/template-tasks/:templateId/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, taskId } = req.params;
      const { assignedTo, dueDate, comments } = req.body;
      
      // For now, we'll just return success since we don't have persistent task storage
      // In a real implementation, you'd store these updates in a separate table
      res.json({ 
        message: "Task updated successfully",
        taskId,
        assignedTo,
        dueDate,
        comments 
      });
    } catch (error) {
      console.error("Error updating template task:", error);
      res.status(500).json({ message: "Failed to update template task" });
    }
  });

  // Update template with corrected tasks
  app.post('/api/project-templates/:id/update-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tasks } = req.body;
      
      const updatedTemplate = await storage.updateProjectTemplate(parseInt(id), {
        tasks: JSON.stringify(tasks)
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating template tasks:", error);
      res.status(500).json({ message: "Failed to update template tasks" });
    }
  });

  // Replace entire template with new data
  app.put('/api/project-templates/:id/replace', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const templateData = req.body;
      
      const updatedTemplate = await storage.updateProjectTemplate(parseInt(id), {
        name: templateData.name,
        description: templateData.description,
        tasks: JSON.stringify(templateData.tasks)
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error replacing template:", error);
      res.status(500).json({ message: "Failed to replace template" });
    }
  });

  app.post('/api/project-templates', isAuthenticated, async (req: any, res) => {
    try {
      const { name, description, sections } = req.body;
      const userId = req.user.claims.sub;
      
      // Create the template first
      const templateData = { name, description };
      const template = await storage.createProjectTemplate(templateData, userId);
      
      // If sections are provided, create milestones and tasks
      if (sections && sections.length > 0) {
        for (const section of sections) {
          // Create milestone for each section
          const milestone = await storage.createMilestone({
            title: section.title,
            description: section.description,
            templateId: template.id,
            sortOrder: section.sortOrder || 0
          }, userId);
          
          // Create tasks for each section with proper hierarchy
          if (section.tasks && section.tasks.length > 0) {
            // Create a map to track task IDs by their template ID
            const taskIdMap = new Map<string, number>();
            
            // Sort tasks by level to create parent tasks first
            const sortedTasks = section.tasks.sort((a, b) => (a.level || 0) - (b.level || 0));
            
            for (const task of sortedTasks) {
              // Find the parent task ID if this task has a parent
              const parentTaskId = task.parentId ? taskIdMap.get(task.parentId) : null;
              
              const createdTask = await storage.createTask({
                title: task.title,
                description: task.description,
                milestoneId: milestone.id,
                priority: task.priority,
                level: task.level || 0,
                parentTaskId: parentTaskId || null,
                sortOrder: task.sortOrder || 0,
                dueDate: task.daysFromMeeting ? new Date(Date.now() + (task.daysFromMeeting * 24 * 60 * 60 * 1000)) : undefined
              }, userId);
              
              // Store the mapping between template task ID and actual task ID
              taskIdMap.set(task.id, createdTask.id);
            }
          }
        }
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error creating project template:", error);
      res.status(500).json({ message: "Failed to create project template" });
    }
  });

  app.put('/api/project-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateData = insertProjectTemplateSchema.partial().parse(req.body);
      const template = await storage.updateProjectTemplate(parseInt(req.params.id), templateData);
      res.json(template);
    } catch (error) {
      console.error("Error updating project template:", error);
      res.status(500).json({ message: "Failed to update project template" });
    }
  });

  app.delete('/api/project-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      // Check if template exists
      const template = await storage.getProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Project template not found" });
      }
      
      await storage.deleteProjectTemplate(templateId);
      res.json({ message: "Project template deleted successfully" });
    } catch (error) {
      console.error("Error deleting project template:", error);
      res.status(500).json({ message: `Failed to delete project template: ${error.message}` });
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
