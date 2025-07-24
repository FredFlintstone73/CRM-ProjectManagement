import { storage } from "./storage";
import { abacusAI } from "./aiProviders/abacusAI";

export interface SearchResult {
  id: string;
  type: 'contact' | 'project' | 'task' | 'note' | 'communication';
  title: string;
  content: string;
  relevance: number;
  metadata: {
    contactName?: string;
    projectName?: string;
    taskName?: string;
    date?: string;
    [key: string]: any;
  };
}

export class AISearchService {
  async search(query: string, userId: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      // Search contacts
      const contacts = await this.searchContacts(query);
      results.push(...contacts);

      // Search projects
      const projects = await this.searchProjects(query);
      results.push(...projects);

      // Search tasks
      const tasks = await this.searchTasks(query);
      results.push(...tasks);

      // Search notes
      const notes = await this.searchNotes(query);
      results.push(...notes);

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 20);

      // Enhance with AI if available
      if (abacusAI.isConfigured()) {
        const enhancedResults = await abacusAI.enhanceSearch(query, sortedResults);
        return enhancedResults;
      }

      return sortedResults;

    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async searchContacts(query: string): Promise<SearchResult[]> {
    const contacts = await storage.searchContacts(query);
    
    return contacts.map(contact => ({
      id: contact.id.toString(),
      type: 'contact' as const,
      title: `${contact.firstName} ${contact.lastName}`,
      content: [
        contact.familyName,
        contact.businessName,
        contact.personalEmail,
        contact.workEmail,
        contact.cellPhone,
        contact.workPhone
      ].filter(Boolean).join(' • '),
      relevance: this.calculateContactRelevance(contact, query),
      metadata: {
        contactName: `${contact.firstName} ${contact.lastName}`,
        date: contact.createdAt?.toISOString()
      }
    }));
  }

  private async searchProjects(query: string): Promise<SearchResult[]> {
    const projects = await storage.searchProjects(query);
    
    return projects.map(project => ({
      id: project.id.toString(),
      type: 'project' as const,
      title: project.name,
      content: project.description || 'No description available',
      relevance: this.calculateProjectRelevance(project, query),
      metadata: {
        projectName: project.name,
        date: project.dueDate?.toISOString() || project.createdAt?.toISOString()
      }
    }));
  }

  private async searchTasks(query: string): Promise<SearchResult[]> {
    const tasks = await storage.searchTasks(query);
    
    return tasks.map(task => ({
      id: task.id.toString(),
      type: 'task' as const,
      title: task.title,
      content: task.description || 'No description available',
      relevance: this.calculateTaskRelevance(task, query),
      metadata: {
        taskName: task.title,
        date: task.dueDate?.toISOString() || task.createdAt?.toISOString()
      }
    }));
  }

  private async searchNotes(query: string): Promise<SearchResult[]> {
    const notes = await storage.searchContactNotes(query);
    
    return notes.map(note => ({
      id: note.id.toString(),
      type: 'note' as const,
      title: `Note by ${note.authorName || 'Unknown'}`,
      content: note.content,
      relevance: this.calculateNoteRelevance(note, query),
      metadata: {
        date: note.createdAt?.toISOString()
      }
    }));
  }

  // Simple relevance scoring - can be enhanced with AI
  private calculateContactRelevance(contact: any, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    const searchableFields = [
      contact.firstName,
      contact.lastName,
      contact.familyName,
      contact.businessName,
      contact.personalEmail,
      contact.workEmail
    ];
    
    searchableFields.forEach(field => {
      if (field && field.toLowerCase().includes(queryLower)) {
        score += field.toLowerCase() === queryLower ? 100 : 50;
      }
    });
    
    return score;
  }

  private calculateProjectRelevance(project: any, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (project.name && project.name.toLowerCase().includes(queryLower)) {
      score += project.name.toLowerCase() === queryLower ? 100 : 75;
    }
    
    if (project.description && project.description.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    return score;
  }

  private calculateTaskRelevance(task: any, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (task.title && task.title.toLowerCase().includes(queryLower)) {
      score += task.title.toLowerCase() === queryLower ? 100 : 75;
    }
    
    if (task.description && task.description.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    return score;
  }

  private calculateNoteRelevance(note: any, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (note.content && note.content.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    return score;
  }
}

export const aiSearchService = new AISearchService();

// Add generateSearchSummary method to the service
aiSearchService.generateSearchSummary = async function(query: string, results: SearchResult[]): Promise<string> {
  return await abacusAI.generateSearchSummary(query, results);
};