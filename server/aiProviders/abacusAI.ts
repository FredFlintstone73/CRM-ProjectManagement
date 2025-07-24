// Abacus.ai Integration Service
// This is prepared for when you provide the API details

export interface AbacusAIConfig {
  apiKey?: string;
  baseUrl?: string;
  deploymentId?: string;
}

export class AbacusAIProvider {
  private config: AbacusAIConfig;

  constructor(config: AbacusAIConfig) {
    this.config = config;
  }

  async enhanceSearch(query: string, searchResults: any[]): Promise<any[]> {
    try {
      console.log(`Enhancing search for query: "${query}" with ${searchResults.length} results using Abacus.ai`);
      
      // Create a context string from search results for AI processing
      const context = searchResults.map(result => 
        `${result.type}: ${result.title} - ${result.content.substring(0, 200)}`
      ).join('\n');

      // Call Abacus.ai API for search enhancement  
      const response = await fetch(`https://abacus.ai/api/v0/getChatResponse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deploymentId: this.config.deploymentId,
          messages: [
            {
              role: "user",
              content: `Search Enhancement Request:
Query: "${query}"

Current Search Results:
${context}

Please analyze these search results and provide enhanced relevance insights. Focus on which results best match the user's query and explain why they are relevant.`
            }
          ],
          regenerateModel: false
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const enhancedContent = aiResponse.response;
        
        if (enhancedContent) {
          // Try to parse AI response and merge with original results
          try {
            const aiSuggestions = JSON.parse(enhancedContent);
            // For now, return original results with AI insights logged
            console.log('AI Enhancement suggestions:', aiSuggestions);
            return searchResults;
          } catch (parseError) {
            console.log('AI Enhancement text:', enhancedContent);
            return searchResults;
          }
        }
      }
      
      return searchResults;
    } catch (error) {
      console.error('Abacus.ai enhancement error:', error);
      // Return original results if AI enhancement fails
      return searchResults;
    }
  }

  async generateSearchInsights(query: string, results: any[]): Promise<string> {
    // Placeholder for AI-generated insights about search results
    if (results.length === 0) {
      return `No results found for "${query}". Try different keywords or check spelling.`;
    }
    
    const types = [...new Set(results.map(r => r.type))];
    return `Found ${results.length} results across ${types.join(', ')} for "${query}".`;
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  async generateSearchSummary(query: string, results: any[]): Promise<string> {
    try {
      if (!this.isConfigured() || results.length === 0) {
        return this.generateSearchInsights(query, results);
      }

      const context = results.slice(0, 5).map(result => 
        `${result.type}: ${result.title} - ${result.content.substring(0, 100)}`
      ).join('\n');

      const response = await fetch(`https://abacus.ai/api/v0/getChatResponse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deploymentId: this.config.deploymentId,
          messages: [
            {
              role: "user",
              content: `Please provide a brief summary of these search results for the query "${query}":

${context}

Summarize what was found in 1-2 sentences.`
            }
          ],
          regenerateModel: false
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        const summary = aiResponse.response;
        if (summary) {
          return summary.trim();
        }
      }

      return this.generateSearchInsights(query, results);
    } catch (error) {
      console.error('AI summary generation error:', error);
      return this.generateSearchInsights(query, results);
    }
  }
}

// Export a default instance with the provided API key
export const abacusAI = new AbacusAIProvider({
  apiKey: "s2_c688f51a70a74263a674a81f01d30127",
  baseUrl: "https://abacus.ai/api/v0",
  deploymentId: process.env.ABACUS_DEPLOYMENT_ID || "default"
});