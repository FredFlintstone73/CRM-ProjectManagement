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
      
      if (!this.isConfigured()) {
        return {
          results: searchResults,
          summary: this.generateSearchInsights(query, searchResults)
        };
      }

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

      return {
        results: searchResults,
        summary: this.generateSearchInsights(query, searchResults)
      };
    } catch (error) {
      console.error('OpenAI enhancement error:', error);
      // Return original results if AI enhancement fails
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