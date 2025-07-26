import { storage } from "./storage";
import { openAI } from "./aiProviders/openAI";

export interface SearchResult {
  id: string;
  type: 'contact' | 'project' | 'task' | 'note' | 'communication' | 'business' | 'email' | 'comment';
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
      // Search core data types first (most reliable)
      const contacts = await this.searchContacts(query);
      results.push(...contacts);
      
      const projects = await this.searchProjects(query);
      results.push(...projects);
      
      const tasks = await this.searchTasks(query);
      results.push(...tasks);
      
      const notes = await this.searchNotes(query);
      results.push(...notes);
      
      // Search additional data types if needed
      try {
        const emails = await this.searchEmails(query);
        results.push(...emails);
        
        const businesses = await this.searchBusinesses(query);
        results.push(...businesses);
      } catch (error) {
        console.error('Additional search error:', error);
        // Continue with core results
      }



      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 30);

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

      // Try AI enhancement with OpenAI
      try {
        const enhancedData = await openAI.enhanceSearch(query, sortedResults);
        return enhancedData;
      } catch (error) {
        console.error('OpenAI enhancement failed, using fallback:', error);
        // Continue with fallback summary if AI fails
      }

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
      title: contact.familyName || `${contact.firstName} ${contact.lastName}`,
      content: this.buildContactContent(contact),
      relevance: this.calculateContactRelevance(contact, query),
      metadata: {
        contactName: contact.familyName || `${contact.firstName} ${contact.lastName}`,
        contactType: contact.contactType,
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

  private async searchEmails(query: string): Promise<SearchResult[]> {
    const emails = await storage.searchEmailInteractions(query);
    return emails.map(email => ({
      id: email.id.toString(),
      type: 'email' as const,
      title: email.subject || 'Email Communication',
      content: `From: ${email.sender} | To: ${email.recipient} | ${email.body?.substring(0, 200) || ''}`,
      relevance: this.calculateTextRelevance(query, (email.subject || '') + ' ' + (email.body || '') + ' ' + email.sender + ' ' + email.recipient),
      metadata: {
        contactId: email.contactId,
        sender: email.sender,
        recipient: email.recipient,
        date: email.timestamp?.toISOString() || ''
      }
    }));
  }

  private async searchProjectComments(query: string): Promise<SearchResult[]> {
    const comments = await storage.searchProjectComments(query);
    return comments.map(comment => ({
      id: comment.id.toString(),
      type: 'comment' as const,
      title: `Project Comment by ${comment.authorName || 'Unknown'}`,
      content: comment.content,
      relevance: this.calculateTextRelevance(query, comment.content),
      metadata: {
        projectId: comment.projectId,
        authorName: comment.authorName,
        date: comment.createdAt?.toISOString() || ''
      }
    }));
  }

  private async searchTaskComments(query: string): Promise<SearchResult[]> {
    const comments = await storage.searchTaskComments(query);
    return comments.map(comment => ({
      id: comment.id.toString(),
      type: 'comment' as const,
      title: `Task Comment by ${comment.authorName || 'Unknown'}`,
      content: comment.content,
      relevance: this.calculateTextRelevance(query, comment.content),
      metadata: {
        taskId: comment.taskId,
        authorName: comment.authorName,
        date: comment.createdAt?.toISOString() || ''
      }
    }));
  }

  private async searchBusinesses(query: string): Promise<SearchResult[]> {
    const businesses = await storage.searchContactBusinesses(query);
    return businesses.map(business => ({
      id: business.id.toString(),
      type: 'business' as const,
      title: business.businessName || 'Business Information',
      content: this.buildBusinessContent(business),
      relevance: this.calculateBusinessRelevance(query, business),
      metadata: {
        contactId: business.contactId,
        businessName: business.businessName,
        businessPhone: business.businessPhone
      }
    }));
  }

  // Helper methods for building content
  private buildContactContent(contact: any): string {
    const parts = [];
    
    // Primary contact
    if (contact.firstName && contact.lastName) {
      parts.push(`${contact.firstName} ${contact.lastName}`);
    }
    
    // Spouse information
    if (contact.spouseFirstName && contact.spouseLastName) {
      parts.push(`Spouse: ${contact.spouseFirstName} ${contact.spouseLastName}`);
    }
    
    // Contact details
    const contactInfo = [
      contact.personalEmail,
      contact.workEmail,
      contact.spousePersonalEmail,
      contact.spouseWorkEmail,
      contact.cellPhone,
      contact.workPhone,
      contact.businessPhone
    ].filter(Boolean);
    
    if (contactInfo.length > 0) {
      parts.push(`Contact: ${contactInfo.join(', ')}`);
    }
    
    // Business and address info
    if (contact.businessName) parts.push(`Business: ${contact.businessName}`);
    if (contact.mailingAddressCity && contact.mailingAddressState) {
      parts.push(`Location: ${contact.mailingAddressCity}, ${contact.mailingAddressState}`);
    }
    
    // Professional contacts
    const professionals = [];
    if (contact.investmentAdvisorName) professionals.push(`Investment Advisor: ${contact.investmentAdvisorName}`);
    if (contact.taxProfessionalName) professionals.push(`Tax Professional: ${contact.taxProfessionalName}`);
    if (contact.attorneyName) professionals.push(`Attorney: ${contact.attorneyName}`);
    if (contact.insuranceAgentName) professionals.push(`Insurance Agent: ${contact.insuranceAgentName}`);
    
    if (professionals.length > 0) {
      parts.push(`Professionals: ${professionals.join(', ')}`);
    }
    
    // Children
    const children = [
      contact.child1Name,
      contact.child2Name,
      contact.child3Name,
      contact.child4Name,
      contact.child5Name,
      contact.child6Name,
      contact.child7Name
    ].filter(Boolean);
    
    if (children.length > 0) {
      parts.push(`Children: ${children.join(', ')}`);
    }
    
    return parts.join(' • ');
  }

  private buildBusinessContent(business: any): string {
    const parts = [];
    
    if (business.businessName) parts.push(business.businessName);
    if (business.businessPhone) parts.push(`Phone: ${business.businessPhone}`);
    if (business.officeManagerName) parts.push(`Manager: ${business.officeManagerName}`);
    if (business.businessAddressCity && business.businessAddressState) {
      parts.push(`Location: ${business.businessAddressCity}, ${business.businessAddressState}`);
    }
    if (business.businessEin) parts.push(`EIN: ${business.businessEin}`);
    if (business.partnershipDetails) parts.push(`Partnership: ${business.partnershipDetails}`);
    
    return parts.join(' • ');
  }

  // Simple relevance scoring - can be enhanced with AI
  private calculateContactRelevance(contact: any, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Comprehensive search fields for contacts including spouse info
    const searchableFields = [
      contact.firstName,
      contact.lastName,
      contact.familyName,
      contact.nickname,
      contact.spouseFirstName,
      contact.spouseLastName,
      contact.spouseNickname,
      contact.businessName,
      contact.personalEmail,
      contact.workEmail,
      contact.spousePersonalEmail,
      contact.spouseWorkEmail,
      contact.cellPhone,
      contact.workPhone,
      contact.businessPhone,
      contact.investmentAdvisorName,
      contact.taxProfessionalName,
      contact.attorneyName,
      contact.insuranceAgentName
    ];
    
    searchableFields.forEach(field => {
      if (field && field.toLowerCase().includes(queryLower)) {
        score += field.toLowerCase() === queryLower ? 100 : 50;
      }
    });
    
    return score;
  }

  private calculateTextRelevance(query: string, text: string): number {
    if (!text) return 0;
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    if (textLower === queryLower) return 100;
    if (textLower.includes(queryLower)) return 75;
    
    // Check for partial word matches
    const queryWords = queryLower.split(' ');
    let wordMatches = 0;
    queryWords.forEach(word => {
      if (textLower.includes(word)) wordMatches++;
    });
    
    return Math.min(wordMatches * 25, 50);
  }

  private calculateBusinessRelevance(query: string, business: any): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    const searchableFields = [
      business.businessName,
      business.businessPhone,
      business.officeManagerName,
      business.businessEin,
      business.partnershipDetails,
      business.businessAddressCity,
      business.businessAddressState
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
    return await openAI.generateSearchSummary(query, results);
  }
}

export const aiSearchService = new ExtendedAISearchService();