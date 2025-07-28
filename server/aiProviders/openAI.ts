// OpenAI Integration Service
import OpenAI from "openai";

export interface OpenAIConfig {
  apiKey?: string;
}

export class OpenAIProvider {
  private openai: OpenAI | null = null;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    if (config.apiKey) {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    }
  }

  private isConfigured(): boolean {
    return !!(this.config.apiKey && this.openai);
  }

  async enhanceSearch(query: string, searchResults: any[]): Promise<{ results: any[], summary: string }> {
    try {
      console.log(`Enhancing search for query: "${query}" with ${searchResults.length} results using OpenAI`);
      console.log(`OpenAI API configured: ${this.isConfigured() ? 'Yes' : 'No'}`);
      
      // Always try enhanced search analysis first
      const enhancedSummary = this.generateEnhancedSearchInsights(query, searchResults);
      
      // Only use OpenAI if we have credits and it's a complex analytical query
      if (this.isConfigured() && this.isAnalyticalQuery(query)) {
        try {
          // Create a context string from search results for AI processing
          const context = searchResults.length > 0 
            ? searchResults.map(result => 
                `${result.type}: ${result.title} - ${result.content.substring(0, 200)}`
              ).join('\n')
            : 'No direct search results found in database.';

          const prompt = `You are a helpful assistant analyzing search results from a CRM system. 
          
User query: "${query}"

Search results:
${context}

Please provide a brief, helpful summary of what was found. Focus on answering the user's query directly. If the query asks for counts or analytics (like "how many meetings" or "who has the most businesses"), provide specific numbers and insights. Keep it to 1-2 sentences.`;

          const response = await this.openai!.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system", 
                content: "You are a helpful CRM assistant. Provide concise, actionable insights from search results. Focus on specific data points and counts when requested."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 150,
            temperature: 0.7
          });

          const aiSummary = response.choices[0]?.message?.content?.trim();
          
          if (aiSummary) {
            return {
              results: searchResults,
              summary: aiSummary
            };
          }
        } catch (error) {
          // Log specific error types for debugging
          if (error.code === 'insufficient_quota') {
            console.log('OpenAI quota exceeded, using enhanced fallback analysis');
          } else {
            console.error('OpenAI API error:', error.message);
          }
          // Continue to fallback
        }
      }

      return {
        results: searchResults,
        summary: enhancedSummary
      };
    } catch (error) {
      console.error('Search enhancement error:', error);
      // Return original results if enhancement fails
      return {
        results: searchResults,
        summary: this.generateSearchInsights(query, searchResults)
      };
    }
  }

  async generateSearchSummary(query: string, results: any[]): Promise<string> {
    try {
      if (!this.isConfigured() || results.length === 0) {
        return this.generateSearchInsights(query, results);
      }

      const context = results.slice(0, 5).map(result => 
        `${result.type}: ${result.title} - ${result.content.substring(0, 100)}`
      ).join('\n');

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a helpful CRM assistant. Analyze search results and provide concise summaries."
          },
          {
            role: "user",
            content: `Please provide a brief summary of these search results for the query "${query}":

${context}

Summarize what was found in 1-2 sentences.`
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      });

      const summary = response.choices[0]?.message?.content?.trim();
      if (summary) {
        return summary;
      }

      return this.generateSearchInsights(query, results);
    } catch (error) {
      console.error('OpenAI summary generation error:', error);
      return this.generateSearchInsights(query, results);
    }
  }

  private isAnalyticalQuery(query: string): boolean {
    const analyticalKeywords = [
      'how many', 'what is the total', 'who has the most', 'who has the least', 'analyze', 'count', 'statistics',
      'compare', 'biggest', 'smallest', 'highest', 'lowest', 'average', 'which contact', 'which project'
    ];
    
    const lowerQuery = query.toLowerCase();
    return analyticalKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private generateEnhancedSearchInsights(query: string, results: any[]): string {
    if (results.length === 0) {
      return this.generateSearchInsights(query, results);
    }

    const types = Array.from(new Set(results.map(r => r.type)));
    const lowerQuery = query.toLowerCase();
    
    // Enhanced analytics for common patterns
    if (lowerQuery.includes('how many')) {
      const contactCount = results.filter(r => r.type === 'contact').length;
      const projectCount = results.filter(r => r.type === 'project').length;
      const taskCount = results.filter(r => r.type === 'task').length;
      
      if (contactCount > 0) {
        return `Found ${contactCount} contact${contactCount !== 1 ? 's' : ''} matching "${query}". This includes ${types.filter(t => t !== 'contact').length > 0 ? 'both contacts and related ' + types.filter(t => t !== 'contact').join(', ') : 'contact information'}.`;
      }
      if (projectCount > 0) {
        return `Found ${projectCount} project${projectCount !== 1 ? 's' : ''} matching "${query}". ${taskCount > 0 ? `Also found ${taskCount} related task${taskCount !== 1 ? 's' : ''}.` : ''}`;
      }
      if (taskCount > 0) {
        return `Found ${taskCount} task${taskCount !== 1 ? 's' : ''} matching "${query}".`;
      }
    }

    if (lowerQuery.includes('meeting')) {
      const projectCount = results.filter(r => r.type === 'project').length;
      const taskCount = results.filter(r => r.type === 'task' && r.title.toLowerCase().includes('meeting')).length;
      if (projectCount > 0) {
        return `Found ${projectCount} project${projectCount !== 1 ? 's' : ''} related to meetings${taskCount > 0 ? ` and ${taskCount} meeting-related task${taskCount !== 1 ? 's' : ''}` : ''}.`;
      }
    }

    if (lowerQuery.includes('business') || lowerQuery.includes('company')) {
      const contactsWithBusiness = results.filter(r => r.type === 'contact' && r.content.includes('•')).length;
      if (contactsWithBusiness > 0) {
        return `Found ${contactsWithBusiness} contact${contactsWithBusiness !== 1 ? 's' : ''} with business information for "${query}".`;
      }
    }

    // Default enhanced summary
    return `Found ${results.length} result${results.length !== 1 ? 's' : ''} across ${types.join(', ')} for "${query}". Results include detailed contact information, project details, and task assignments.`;
  }

  private generateSearchInsights(query: string, results: any[]): string {
    if (results.length === 0) {
      // Provide intelligent fallback based on query type
      if (query.toLowerCase().includes('meeting')) {
        return "No meetings found matching your search criteria.";
      } else if (query.toLowerCase().includes('contact') || query.toLowerCase().includes('client')) {
        return "No contacts found matching your search criteria.";
      } else if (query.toLowerCase().includes('project')) {
        return "No projects found matching your search criteria.";
      } else if (query.toLowerCase().includes('task')) {
        return "No tasks found matching your search criteria.";
      }
      return `No results found for "${query}".`;
    }

    // Generate insights based on results
    const resultTypes = new Set();
    results.forEach(result => {
      if (result.type) resultTypes.add(result.type);
    });

    let insight = `Found ${results.length} result${results.length === 1 ? '' : 's'}`;
    if (resultTypes.size > 0) {
      insight += ` across ${Array.from(resultTypes).join(', ')}`;
    }
    insight += ` for "${query}".`;

    return insight;
  }
    }

    const types = Array.from(new Set(results.map(r => r.type)));
    const typeCount = types.length > 1 ? ` across ${types.join(', ')}` : ` in ${types[0]}s`;
    
    // Provide analytics for common query patterns
    if (query.toLowerCase().includes('how many')) {
      const contactCount = results.filter(r => r.type === 'contact').length;
      const projectCount = results.filter(r => r.type === 'project').length;
      const taskCount = results.filter(r => r.type === 'task').length;
      
      if (contactCount > 0) return `Found ${contactCount} contact${contactCount !== 1 ? 's' : ''} matching your criteria.`;
      if (projectCount > 0) return `Found ${projectCount} project${projectCount !== 1 ? 's' : ''} matching your criteria.`;
      if (taskCount > 0) return `Found ${taskCount} task${taskCount !== 1 ? 's' : ''} matching your criteria.`;
    }

    return `Found ${results.length} result${results.length !== 1 ? 's' : ''}${typeCount} for "${query}".`;
  }
}

// Export a default instance with the OpenAI API key
export const openAI = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY
});