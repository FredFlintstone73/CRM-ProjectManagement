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
  insertContactNoteSchema,
  insertTaskCommentSchema,
  insertUserInvitationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Auto-create contact record if it doesn't exist
      if (user) {
        await storage.ensureUserHasContact(user);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user's contact ID
  app.get('/api/auth/contact-id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const contactId = await storage.getUserContactId(user);
      res.json({ contactId });
    } catch (error) {
      console.error("Error fetching user contact ID:", error);
      res.status(500).json({ message: "Failed to fetch user contact ID" });
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
      if (error.message.includes("Cannot delete contact")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete contact" });
      }
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
      console.error('==================== POST /api/projects CALLED ====================');
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      const projectData = insertProjectSchema.parse(req.body);
      console.error('Parsed project data:', JSON.stringify(projectData, null, 2));
      const userId = req.user.claims.sub;
      
      // Check if this is a meeting with a template-supported type
      const meetingType = projectData.projectType;
      const meetingDate = projectData.dueDate;
      
      console.log('Project creation - meetingType:', meetingType, 'meetingDate:', meetingDate);
      console.log('ProjectData parsed:', projectData);
      
      if (meetingType && meetingDate) {
        // Try to find a template for this meeting type
        const templates = await storage.getProjectTemplates();
        console.log('Available templates:', templates.map(t => ({ id: t.id, name: t.name, meetingType: t.meetingType })));
        const matchingTemplate = templates.find(template => template.meetingType === meetingType);
        
        console.log('Matching template:', matchingTemplate);
        console.log('Template comparison - looking for:', meetingType, 'found templates with types:', templates.map(t => t.meetingType));
        
        if (matchingTemplate) {
          // Create project from template instead of regular project creation
          const templateTasks = await storage.getTemplateTasksByTemplate(matchingTemplate.id);
          const templateMilestones = await storage.getProjectTemplateMilestones(matchingTemplate.id);
          
          console.log('Template tasks retrieved:', templateTasks);
          console.log('Template milestones retrieved:', templateMilestones);
          
          // Create the project
          const newProject = await storage.createProject(projectData, userId);
          
          // Create milestones first, sorted by sortOrder to preserve template ordering
          const createdMilestones = [];
          const sortedMilestones = [...templateMilestones].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          for (const milestone of sortedMilestones) {
            const createdMilestone = await storage.createMilestone({
              title: milestone.title,
              projectId: newProject.id,
              dueDate: null,
              description: milestone.description || '',
              status: 'active',
              sortOrder: milestone.sortOrder || 0
            }, userId);
            createdMilestones.push(createdMilestone);
          }
          
          // Create tasks from template with calculated due dates
          const createdTasks = [];
          const taskMapping = new Map(); // Map template task IDs to created task IDs
          
          // Sort template tasks to preserve original template order
          // First by milestone order, then by template task ID to preserve creation order
          const sortedTasks = [...templateTasks].sort((a, b) => {
            // First sort by milestone order
            const aMilestoneSort = templateMilestones.find(m => m.id === a.milestoneId)?.sortOrder ?? 999;
            const bMilestoneSort = templateMilestones.find(m => m.id === b.milestoneId)?.sortOrder ?? 999;
            if (aMilestoneSort !== bMilestoneSort) return aMilestoneSort - bMilestoneSort;
            
            // Then by task ID to preserve original template ordering
            return a.id - b.id;
          });
          
          // Separate tasks by dependencies and parent relationships
          const tasksWithoutDependencies = sortedTasks.filter(task => !task.dependsOnTaskId);
          const tasksWithDependencies = sortedTasks.filter(task => task.dependsOnTaskId);
          
          // Helper function to create a task with parent mapping
          const createTaskFromTemplate = async (templateTask: any, parentTaskId?: number, taskIndex?: number) => {
            let taskDueDate = null;
            
            // Check if this is a child task under "Generate Database Reports and Documents for Preliminary Packet"
            // or "Nominations and Deliverables Checkpoints" - these child tasks should not have due dates
            const shouldSkipDateAssignment = templateTask.parentTaskId && (() => {
              const parentTask = templateTasks.find(t => t.id === templateTask.parentTaskId);
              return parentTask && (
                parentTask.title === "Generate Database Reports and Documents for Preliminary Packet" ||
                parentTask.title === "Nominations and Deliverables Checkpoints"
              );
            })();
            
            if (templateTask.dueDate) {
              // Use custom due date if specified (for DRPM task)
              taskDueDate = new Date(templateTask.dueDate);
            } else if (!shouldSkipDateAssignment && templateTask.daysFromMeeting !== null && templateTask.daysFromMeeting !== undefined) {
              // Use days from meeting calculation (skip for specific child tasks)
              const baseDate = new Date(meetingDate);
              baseDate.setDate(baseDate.getDate() + templateTask.daysFromMeeting);
              taskDueDate = baseDate;
            }
            
            // Resolve role-based assignment if assignedToRole is provided
            let assignedToId = null;
            let roleAssignment = null;
            if (templateTask.assignedToRole) {
              const resolution = await resolveRoleAssignment(templateTask.assignedToRole);
              assignedToId = resolution.contactIds;
              roleAssignment = resolution.unassignedRoles.length > 0 ? resolution.unassignedRoles : null;
            } else if (templateTask.assignedTo) {
              assignedToId = templateTask.assignedTo;
            }
            
            // Find the corresponding milestone
            const milestone = createdMilestones.find(m => 
              templateMilestones.find(tm => tm.id === templateTask.milestoneId)?.title === m.title
            );
            
            // Map parent task ID if it was remapped during creation
            const mappedParentTaskId = templateTask.parentTaskId ? 
              taskMapping.get(templateTask.parentTaskId) : null;
            
            const task = await storage.createTask({
              title: templateTask.title.trim(),
              description: templateTask.description || '',
              projectId: newProject.id,
              status: 'todo',
              priority: templateTask.priority || 25,
              estimatedDays: 1,
              dueDate: taskDueDate,
              assignedTo: assignedToId,
              assignedToRole: roleAssignment || templateTask.assignedToRole || null,
              parentTaskId: mappedParentTaskId,
              milestoneId: milestone?.id || null,
              level: templateTask.level || 0,
              sortOrder: taskIndex !== undefined ? taskIndex : (templateTask.sortOrder || 0),
              daysFromMeeting: templateTask.daysFromMeeting
            }, userId);
            
            // Store the mapping for dependency resolution and child task creation
            taskMapping.set(templateTask.id, task.id);
            createdTasks.push(task);
            
            return task;
          };
          
          // First pass: Create all tasks without dependencies in proper hierarchical order
          const processedTaskIds = new Set();
          
          // Separate parent tasks (no parentTaskId) from child tasks
          const parentTasks = tasksWithoutDependencies.filter(task => !task.parentTaskId);
          const childTasks = tasksWithoutDependencies.filter(task => task.parentTaskId);
          
          // Create parent tasks first with proper sort order
          for (let i = 0; i < parentTasks.length; i++) {
            const templateTask = parentTasks[i];
            // Skip tasks with empty or null titles
            if (!templateTask.title || templateTask.title.trim() === '') {
              console.log('Skipping template task with empty title:', templateTask);
              continue;
            }
            
            await createTaskFromTemplate(templateTask, undefined, i);
            processedTaskIds.add(templateTask.id);
          }
          
          // Then create child tasks in multiple passes to handle nested hierarchies
          let remainingChildTasks = [...childTasks];
          let maxPasses = 5; // Prevent infinite loop
          
          while (remainingChildTasks.length > 0 && maxPasses > 0) {
            const currentPass = [...remainingChildTasks];
            remainingChildTasks = [];
            
            for (let i = 0; i < currentPass.length; i++) {
              const templateTask = currentPass[i];
              // Skip tasks with empty or null titles
              if (!templateTask.title || templateTask.title.trim() === '') {
                continue;
              }
              
              // Check if parent task has been created
              const parentCreated = taskMapping.has(templateTask.parentTaskId);
              
              if (parentCreated) {
                // Use original position in sorted tasks for sort order
                const originalIndex = sortedTasks.findIndex(t => t.id === templateTask.id);
                await createTaskFromTemplate(templateTask, undefined, originalIndex);
                processedTaskIds.add(templateTask.id);
              } else {
                // Parent not created yet, try in next pass
                remainingChildTasks.push(templateTask);
              }
            }
            
            maxPasses--;
          }
          
          // Log any remaining unprocessed tasks
          if (remainingChildTasks.length > 0) {
            console.log('Warning: Some child tasks could not be processed:', remainingChildTasks.map(t => t.title));
          }
          
          // Second pass: Process tasks with dependencies
          for (let i = 0; i < tasksWithDependencies.length; i++) {
            const templateTask = tasksWithDependencies[i];
            let taskDueDate = null;
            
            // Find the dependent task from already created tasks
            const dependentTaskId = taskMapping.get(templateTask.dependsOnTaskId);
            const dependentTask = createdTasks.find(t => t.id === dependentTaskId);
            
            if (dependentTask && dependentTask.dueDate) {
              // Calculate due date based on the task type
              const baseDate = new Date(dependentTask.dueDate);
              if (templateTask.title === "Packet Sealed and Made Available to TA") {
                // 3 days after DRPM task
                baseDate.setDate(baseDate.getDate() + 3);
              } else {
                // 1 day after DRPM task (for Corrections task)
                baseDate.setDate(baseDate.getDate() + 1);
              }
              taskDueDate = baseDate;
            }
            
            // Resolve role-based assignment if assignedToRole is provided
            let assignedToId = null;
            let roleAssignment = null;
            if (templateTask.assignedToRole) {
              const resolution = await resolveRoleAssignment(templateTask.assignedToRole);
              assignedToId = resolution.contactIds;
              roleAssignment = resolution.unassignedRoles.length > 0 ? resolution.unassignedRoles : null;
            } else if (templateTask.assignedTo) {
              assignedToId = templateTask.assignedTo;
            }
            
            // Find the corresponding milestone
            const milestone = createdMilestones.find(m => 
              templateMilestones.find(tm => tm.id === templateTask.milestoneId)?.title === m.title
            );
            
            // Skip tasks with empty or null titles
            if (!templateTask.title || templateTask.title.trim() === '') {
              console.log('Skipping template task with empty title:', templateTask);
              continue;
            }
            
            // Map parent task ID if it was remapped during creation
            const mappedParentTaskId = templateTask.parentTaskId ? 
              taskMapping.get(templateTask.parentTaskId) : null;
            
            // Get original index in sorted tasks for sort order
            const originalIndex = sortedTasks.findIndex(t => t.id === templateTask.id);
            
            const task = await storage.createTask({
              title: templateTask.title.trim(),
              description: templateTask.description || '',
              projectId: newProject.id,
              status: 'todo',
              priority: templateTask.priority || 25,
              estimatedDays: 1,
              dueDate: taskDueDate,
              assignedTo: assignedToId,
              assignedToRole: roleAssignment || templateTask.assignedToRole || null,
              parentTaskId: mappedParentTaskId,
              milestoneId: milestone?.id || null,
              level: templateTask.level || 0,
              sortOrder: originalIndex >= 0 ? originalIndex : (templateTask.sortOrder || 0),
              dependsOnTaskId: dependentTaskId, // Use mapped created task ID
              daysFromMeeting: null // Dependent tasks don't use days from meeting
            }, userId);
            
            createdTasks.push(task);
            taskMapping.set(templateTask.id, task.id);
          }
          
          // After all tasks are created, resolve role-based assignments
          console.log('Resolving role-based assignments for project:', newProject.id);
          await storage.resolveRoleAssignments(newProject.id);
          
          return res.status(201).json({
            project: newProject,
            tasks: createdTasks,
            milestones: createdMilestones,
            message: `Created project with ${createdTasks.length} tasks from ${matchingTemplate.name} template`
          });
        }
      }
      
      // Fallback to regular project creation if no template found
      console.log('==================== NO TEMPLATE FOUND ====================');
      console.log('Creating regular project with default milestones');
      const project = await storage.createProject(projectData, userId);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Helper function to resolve role-based assignments
  const resolveRoleAssignment = async (roles: string[] | string) => {
    if (!roles || (Array.isArray(roles) && roles.length === 0)) return { contactIds: null, unassignedRoles: [] };
    
    // Normalize to array
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    // Get all active team members (excluding placeholder team members)
    const teamMembers = await storage.getContactsByType('team_member');
    const activeTeamMembers = teamMembers.filter(member => 
      member.status === 'active' &&
      // Exclude any placeholder team members that might exist
      !(
        (member.firstName === 'Admin' && member.lastName === 'Assistant') ||
        (member.firstName === 'Financial' && member.lastName === 'Planner') ||
        (member.firstName === 'Insurance' && member.lastName === 'Business') ||
        (member.firstName === 'Insurance' && member.lastName === 'Health')
      )
    );
    
    const assignedContactIds = [];
    const unassignedRoles = [];
    
    // Resolve each role to contact IDs
    for (const role of roleArray) {
      const matchingContacts = activeTeamMembers.filter(contact => contact.role === role);
      
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
        console.log(`No active team member found for role: ${role}. Keeping as role assignment for manual assignment.`);
      }
    }
    
    console.log(`Resolved roles [${roleArray.join(', ')}] to contacts: [${assignedContactIds.join(', ')}], unassigned roles: [${unassignedRoles.join(', ')}]`);
    
    return { 
      contactIds: assignedContactIds.length > 0 ? assignedContactIds : null,
      unassignedRoles 
    };
  };

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
        // Resolve role-based assignment if assignedToRole is provided
        let assignedToId = null;
        if (taskData.assignedToRole) {
          const resolution = await resolveRoleAssignment(taskData.assignedToRole);
          assignedToId = resolution.contactIds;
          taskData.assignedToRole = resolution.unassignedRoles.length > 0 ? resolution.unassignedRoles : null;
        } else if (taskData.assignedTo) {
          assignedToId = parseInt(taskData.assignedTo);
        }
        
        const task = await storage.createTask({
          title: taskData.title,
          description: taskData.description || '',
          projectId: newProject.id,
          status: (taskData.status || 'todo') as const,
          priority: (taskData.priority || 'medium') as const,
          estimatedDays: 1,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          assignedTo: assignedToId,
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

  // Resolve role-based assignments to contact IDs
  app.post('/api/projects/:id/resolve-roles', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.resolveRoleAssignments(projectId);
      res.json({ message: "Role assignments resolved successfully" });
    } catch (error) {
      console.error("Error resolving role assignments:", error);
      res.status(500).json({ message: "Failed to resolve role assignments" });
    }
  });

  // User task priority routes
  app.get('/api/tasks/:id/user-priority', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const userPriority = await storage.getUserTaskPriority(taskId, userId);
      res.json({ priority: userPriority?.priority || null });
    } catch (error) {
      console.error("Error getting user task priority:", error);
      res.status(500).json({ message: "Failed to get user task priority" });
    }
  });

  app.put('/api/tasks/:id/user-priority', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { priority } = req.body;

      // Get user's contact ID for linking
      const userContact = await storage.getUserContactId({ id: userId } as any);

      const updatedPriority = await storage.setUserTaskPriority(taskId, userId, userContact, priority);
      res.json(updatedPriority);
    } catch (error) {
      console.error("Error setting user task priority:", error);
      res.status(500).json({ message: "Failed to set user task priority" });
    }
  });

  // Get tasks with user-specific priorities
  app.get('/api/tasks/my-tasks-with-priorities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasksWithPriorities = await storage.getUserTasksWithPriorities(userId);
      res.json(tasksWithPriorities);
    } catch (error) {
      console.error("Error fetching user tasks with priorities:", error);
      res.status(500).json({ message: "Failed to fetch user tasks with priorities" });
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
      

      
      // Handle assignedTo - can be array (multi-select) or single value
      let assignedTo = null;
      if (taskData.assignedTo) {
        const processAssignedTo = async (value: string | number) => {
          if (typeof value === 'string') {
            if (value === "me" || value.startsWith("me_")) {
              // Find the current user's contact ID from the contacts table
              const userEmail = req.user.email || req.user.claims?.email;
              const userContacts = await storage.getContacts();
              const userContact = userContacts.find(contact => 
                contact.personalEmail === userEmail || 
                contact.workEmail === userEmail
              );
              return userContact ? userContact.id : null;
            } else if (value.startsWith("team_")) {
              return parseInt(value.replace("team_", ""));
            } else {
              return parseInt(value.toString());
            }
          } else if (typeof value === 'number') {
            return value;
          }
          return null;
        };

        if (Array.isArray(taskData.assignedTo)) {
          // Multi-select: process each assignment
          const processedAssignments = await Promise.all(
            taskData.assignedTo.map(processAssignedTo)
          );
          const validAssignments = processedAssignments.filter(id => id !== null);
          assignedTo = validAssignments.length > 0 ? validAssignments : null;
        } else {
          // Single assignment - convert to array for database consistency
          const processed = await processAssignedTo(taskData.assignedTo);
          assignedTo = processed ? [processed] : null;
        }
      }
      
      // Handle assignedToRole - can be array (multi-select) or single value
      let assignedToRole = null;
      if (taskData.assignedToRole) {
        if (Array.isArray(taskData.assignedToRole)) {
          // Multi-select roles
          const validRoles = taskData.assignedToRole.filter(role => role && role !== "none");
          assignedToRole = validRoles.length > 0 ? validRoles : null;
        } else {
          // Single role - convert to array for database consistency
          assignedToRole = taskData.assignedToRole !== "none" ? [taskData.assignedToRole] : null;
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
        assignedToRole: assignedToRole,
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
      
      // Handle assignedTo - can be array (multi-select) or single value
      let assignedTo = null;
      if (taskData.assignedTo) {
        const processAssignedTo = async (value: string | number) => {
          if (typeof value === 'string') {
            if (value === "me" || value.startsWith("me_")) {
              // Find the current user's contact ID from the contacts table
              const userEmail = req.user.email || req.user.claims?.email;
              const userContacts = await storage.getContacts();
              const userContact = userContacts.find(contact => 
                contact.personalEmail === userEmail || 
                contact.workEmail === userEmail
              );
              return userContact ? userContact.id : null;
            } else if (value.startsWith("team_")) {
              return parseInt(value.replace("team_", ""));
            } else {
              return parseInt(value.toString());
            }
          } else if (typeof value === 'number') {
            return value;
          }
          return null;
        };

        if (Array.isArray(taskData.assignedTo)) {
          // Multi-select: process each assignment
          const processedAssignments = await Promise.all(
            taskData.assignedTo.map(processAssignedTo)
          );
          const validAssignments = processedAssignments.filter(id => id !== null);
          assignedTo = validAssignments.length > 0 ? validAssignments : null;
        } else {
          // Single assignment - convert to array for database consistency
          const processed = await processAssignedTo(taskData.assignedTo);
          assignedTo = processed ? [processed] : null;
        }
      }
      
      // Convert priority to number if provided
      let priority = 25;
      if (taskData.priority !== undefined && taskData.priority !== null) {
        const priorityNum = typeof taskData.priority === 'string' ? parseInt(taskData.priority) : taskData.priority;
        priority = isNaN(priorityNum) ? 25 : priorityNum;
      }
      
      // Handle assignedToRole - can be array (multi-select) or single value
      let assignedToRole = null;
      if (taskData.assignedToRole) {
        if (Array.isArray(taskData.assignedToRole)) {
          // Multi-select roles
          const validRoles = taskData.assignedToRole.filter(role => role && role !== "none");
          assignedToRole = validRoles.length > 0 ? validRoles : null;
        } else {
          // Single role - convert to array for database consistency
          assignedToRole = taskData.assignedToRole !== "none" ? [taskData.assignedToRole] : null;
        }
      }

      // Clean up null/empty values
      const cleanedTaskData = {
        ...taskData,
        assignedTo: assignedTo,
        priority: priority,
        description: taskData.description || null,
        dueDate: taskData.dueDate || null,
        daysFromMeeting: taskData.daysFromMeeting !== undefined && taskData.daysFromMeeting !== null ? parseInt(taskData.daysFromMeeting.toString()) : null,
        assignedToRole: assignedToRole,
        dependsOnTaskId: taskData.dependsOnTaskId || null,
      };
      
      // Remove fields that are null/undefined from the update, but keep title if provided
      const processedTaskData = Object.fromEntries(
        Object.entries(cleanedTaskData).filter(([key, value]) => {
          if (key === 'title') return value !== null && value !== undefined && value !== '';
          return value !== null && value !== undefined;
        })
      );
      
      console.log('Final processed task for update:', processedTaskData);
      
      const userId = req.user.claims.sub;
      const task = await storage.updateTask(parseInt(req.params.id), processedTaskData, userId);
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
          // Check if assignedTo is a string before using string methods
          if (typeof taskData.assignedTo === 'string') {
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
          } else {
            // If it's already a number, use it directly
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
        ...(taskData.assignedTo !== undefined && { assignedTo: assignedTo ? [assignedTo] : null }),
        ...(taskData.priority !== undefined && { priority }),
        ...(taskData.milestoneId !== undefined && {
          milestoneId: safeParseInt(taskData.milestoneId)
        }),
        ...(taskData.parentTaskId !== undefined && {
          parentTaskId: safeParseInt(taskData.parentTaskId)
        }),
      };
      

      
      const userId = req.user.claims.sub;
      const task = await storage.updateTask(parseInt(req.params.id), processedTaskData, userId);
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

  // Task reordering endpoint
  app.post('/api/tasks/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { taskUpdates } = req.body;
      if (!Array.isArray(taskUpdates)) {
        return res.status(400).json({ message: "taskUpdates must be an array" });
      }
      
      await storage.reorderTasks(taskUpdates);
      res.json({ message: "Tasks reordered successfully" });
    } catch (error) {
      console.error("Error reordering tasks:", error);
      res.status(500).json({ message: "Failed to reorder tasks" });
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
      console.log('Milestones request - projectId:', projectId, 'templateId:', templateId);
      let milestones;
      
      if (projectId) {
        console.log('Getting milestones by project:', projectId);
        milestones = await storage.getMilestonesByProject(parseInt(projectId as string));
      } else if (templateId) {
        console.log('Getting milestones by template:', templateId);
        milestones = await storage.getMilestonesByTemplate(parseInt(templateId as string));
      } else {
        console.log('Getting all milestones');
        milestones = await storage.getMilestones();
      }
      
      console.log('Returning milestones:', milestones.map(m => ({ id: m.id, title: m.title, templateId: m.templateId })));
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  // Specific routes should come before parameterized routes
  app.put('/api/milestones/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { milestoneIds } = req.body;
      console.log('Received milestone IDs for reordering:', milestoneIds);
      console.log('Types:', milestoneIds.map((id: any) => typeof id));
      
      // Ensure all IDs are valid integers
      const validIds = milestoneIds.map((id: any) => {
        const parsed = parseInt(String(id));
        if (isNaN(parsed)) {
          throw new Error(`Invalid milestone ID: ${id}`);
        }
        return parsed;
      });
      
      console.log('Valid milestone IDs:', validIds);
      await storage.reorderMilestones(validIds);
      res.json({ message: "Milestones reordered successfully" });
    } catch (error) {
      console.error("Error reordering milestones:", error);
      res.status(500).json({ message: "Failed to reorder milestones" });
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

  // Copy project template
  app.post('/api/project-templates/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get the original template
      const originalTemplate = await storage.getProjectTemplate(templateId);
      if (!originalTemplate) {
        return res.status(404).json({ message: "Project template not found" });
      }
      
      // Create a new template with copied data
      const newTemplate = await storage.createProjectTemplate({
        name: `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        meetingType: originalTemplate.meetingType,
      }, userId);
      
      // Get all milestones from the original template
      const originalMilestones = await storage.getMilestonesByTemplate(templateId);
      
      // Copy milestones and their tasks
      for (const milestone of originalMilestones) {
        const newMilestone = await storage.createMilestone({
          title: milestone.title,
          description: milestone.description,
          templateId: newTemplate.id,
          sortOrder: milestone.sortOrder,
        }, userId);
        
        // Get tasks for this milestone
        const originalTasks = await storage.getTasksByMilestone(milestone.id);
        
        // Copy tasks with their hierarchy
        const taskIdMap = new Map<number, number>();
        
        // First pass: create all tasks with ALL original template data
        for (const task of originalTasks) {
          const newTask = await storage.createTask({
            title: task.title,
            description: task.description,
            milestoneId: newMilestone.id,
            assignedTo: task.assignedTo,
            assignedToRole: task.assignedToRole, // Copy role assignments
            priority: task.priority,
            dueDate: null, // Reset due dates for template
            status: 'todo', // Reset status for copied tasks
            parentTaskId: null, // Will be set in second pass
            level: task.level, // Copy hierarchy level
            sortOrder: task.sortOrder, // Copy sort order
            daysFromMeeting: task.daysFromMeeting, // Copy days from meeting calculation
            dependsOnTaskId: null, // Will be set in third pass for dependencies
          }, userId);
          
          taskIdMap.set(task.id, newTask.id);
        }
        
        // Second pass: set parent task relationships
        for (const task of originalTasks) {
          if (task.parentTaskId) {
            const newTaskId = taskIdMap.get(task.id);
            const newParentTaskId = taskIdMap.get(task.parentTaskId);
            
            if (newTaskId && newParentTaskId) {
              await storage.updateTask(newTaskId, {
                parentTaskId: newParentTaskId,
              });
            }
          }
        }
        
        // Third pass: set task dependencies
        for (const task of originalTasks) {
          if (task.dependsOnTaskId) {
            const newTaskId = taskIdMap.get(task.id);
            const newDependentTaskId = taskIdMap.get(task.dependsOnTaskId);
            
            if (newTaskId && newDependentTaskId) {
              await storage.updateTask(newTaskId, {
                dependsOnTaskId: newDependentTaskId,
              });
            }
          }
        }
      }
      
      res.json(newTemplate);
    } catch (error) {
      console.error("Error copying project template:", error);
      res.status(500).json({ message: "Failed to copy project template" });
    }
  });

  // Get task count for a specific template
  app.get('/api/project-templates/:id/task-count', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const taskCount = await storage.getTemplateTaskCount(templateId);
      res.json({ taskCount });
    } catch (error) {
      console.error("Error fetching template task count:", error);
      res.status(500).json({ message: "Failed to fetch template task count" });
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

  // Access control middleware
  const requireAdministrator = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const accessLevel = await storage.getUserAccessLevel(userId);
      
      if (accessLevel !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking administrator access:", error);
      res.status(500).json({ message: "Failed to verify access level" });
    }
  };

  const requireManagerOrAbove = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const accessLevel = await storage.getUserAccessLevel(userId);
      
      if (!['administrator', 'manager'].includes(accessLevel || '')) {
        return res.status(403).json({ message: "Manager or Administrator access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking manager access:", error);
      res.status(500).json({ message: "Failed to verify access level" });
    }
  };

  // User invitation routes (Administrator only)
  app.post('/api/user-invitations', isAuthenticated, requireAdministrator, async (req: any, res) => {
    try {
      const invitationData = insertUserInvitationSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      const invitation = await storage.createUserInvitation({
        ...invitationData,
        invitedBy: userId,
      });
      
      res.json(invitation);
    } catch (error) {
      console.error("Error creating user invitation:", error);
      res.status(500).json({ message: "Failed to create user invitation" });
    }
  });

  app.get('/api/user-invitations', isAuthenticated, requireAdministrator, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitations = await storage.getUserInvitations(userId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching user invitations:", error);
      res.status(500).json({ message: "Failed to fetch user invitations" });
    }
  });

  app.get('/api/user-invitations/:code', async (req: any, res) => {
    try {
      const invitation = await storage.getUserInvitation(req.params.code);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.expireInvitation(req.params.code);
        return res.status(410).json({ message: "Invitation has expired" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }
      
      res.json(invitation);
    } catch (error) {
      console.error("Error fetching invitation:", error);
      res.status(500).json({ message: "Failed to fetch invitation" });
    }
  });

  app.post('/api/user-invitations/:code/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitation = await storage.acceptUserInvitation(req.params.code, userId);
      
      // Update user's access level based on invitation
      await storage.updateUserAccessLevel(userId, invitation.accessLevel);
      
      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // User access level routes (Administrator only)
  app.get('/api/users/:id/access-level', isAuthenticated, requireAdministrator, async (req: any, res) => {
    try {
      const accessLevel = await storage.getUserAccessLevel(req.params.id);
      res.json({ accessLevel });
    } catch (error) {
      console.error("Error fetching user access level:", error);
      res.status(500).json({ message: "Failed to fetch user access level" });
    }
  });

  app.put('/api/users/:id/access-level', isAuthenticated, requireAdministrator, async (req: any, res) => {
    try {
      const { accessLevel } = req.body;
      const user = await storage.updateUserAccessLevel(req.params.id, accessLevel);
      res.json(user);
    } catch (error) {
      console.error("Error updating user access level:", error);
      res.status(500).json({ message: "Failed to update user access level" });
    }
  });

  // Current user's access level (accessible to all authenticated users)
  app.get('/api/auth/access-level', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accessLevel = await storage.getUserAccessLevel(userId);
      res.json({ accessLevel });
    } catch (error) {
      console.error("Error fetching current user access level:", error);
      res.status(500).json({ message: "Failed to fetch access level" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
