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
  async search(query: string, userId: string): Promise<{ results: SearchResult[], summary: string }> {
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

      // Generate a basic summary for search results
      let summary = '';
      if (sortedResults.length > 0) {
        const types = Array.from(new Set(sortedResults.map(r => r.type)));
        summary = `Found ${sortedResults.length} result${sortedResults.length !== 1 ? 's' : ''} across ${types.join(', ')} for "${query}".`;
        
        // Add analytical insights for specific queries
        if (this.isAnalyticalQuery(query)) {
          summary += this.generateAnalyticalSummary(query, sortedResults);
        }
      } else {
        summary = `No results found for "${query}". Try different keywords or check spelling.`;
      }

      // Try AI enhancement if available (currently disabled pending proper deployment credentials)
      // if (abacusAI.isConfigured()) {
      //   const enhancedData = await abacusAI.enhanceSearch(query, sortedResults);
      //   return enhancedData;
      // }

      return { results: sortedResults, summary };

    } catch (error) {
      console.error('Search error:', error);
      return { results: [], summary: '' };
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

  private isAnalyticalQuery(query: string): boolean {
    const analyticalKeywords = [
      'who has the most', 'who has the least', 'how many', 'what is the average',
      'which contact', 'which project', 'total number', 'count of', 'statistics',
      'analyze', 'compare', 'biggest', 'smallest', 'highest', 'lowest'
    ];
    
    const lowerQuery = query.toLowerCase();
    return analyticalKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private generateAnalyticalSummary(query: string, results: SearchResult[]): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('how many meetings') || lowerQuery.includes('meetings')) {
      const projectCount = results.filter(r => r.type === 'project').length;
      return ` Based on current data, there ${projectCount === 1 ? 'is' : 'are'} ${projectCount} project${projectCount !== 1 ? 's' : ''} that could involve meetings.`;
    }
    
    if (lowerQuery.includes('who has the most businesses')) {
      const contacts = results.filter(r => r.type === 'contact');
      if (contacts.length > 0) {
        return ` Found ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} with business information.`;
      }
    }
    
    return '';
  }
}

export class ExtendedAISearchService extends AISearchService {
  async generateSearchSummary(query: string, results: SearchResult[]): Promise<string> {
    return await abacusAI.generateSearchSummary(query, results);
  }
}

export const aiSearchService = new ExtendedAISearchService();