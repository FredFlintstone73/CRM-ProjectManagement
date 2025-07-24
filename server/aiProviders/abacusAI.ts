// Abacus.ai Integration Service
// This is prepared for when you provide the API details

export interface AbacusAIConfig {
  apiKey?: string;
  baseUrl?: string;
  deploymentToken?: string;
}

export class AbacusAIProvider {
  private config: AbacusAIConfig;

  constructor(config: AbacusAIConfig) {
    this.config = config;
  }

  async enhanceSearch(query: string, searchResults: any[]): Promise<{ results: any[], summary: string }> {
    try {
      console.log(`Enhancing search for query: "${query}" with ${searchResults.length} results using Abacus.ai`);
      
      // Create a context string from search results for AI processing
      const context = searchResults.length > 0 
        ? searchResults.map(result => 
            `${result.type}: ${result.title} - ${result.content.substring(0, 200)}`
          ).join('\n')
        : 'No direct search results found in database.';

      // Determine the type of query to provide better AI context
      const isAnalyticalQuery = this.isAnalyticalQuery(query);
      const contextualPrompt = isAnalyticalQuery ? 
        `This appears to be an analytical question about the database. Please provide insights or analysis based on the available data. If no direct results were found, explain what type of data would be needed to answer this question.` :
        `Please analyze these search results and provide enhanced relevance insights. Focus on which results best match the user's query and explain why they are relevant.`;

      // Call Abacus.ai API for search enhancement  
      const response = await fetch(`https://abacus.ai/api/v0/getChatResponse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deploymentToken: this.config.deploymentToken,
          messages: [
            {
              role: "user",
              content: `Search Enhancement Request:
Query: "${query}"

Current Search Results:
${context}

${contextualPrompt}`
            }
          ],
          regenerateModel: false
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        console.log('Abacus.ai API response:', aiResponse);
        const enhancedContent = aiResponse.response;
        
        if (enhancedContent) {
          return {
            results: searchResults,
            summary: enhancedContent
          };
        }
      } else {
        console.log('Abacus.ai API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
      
      return {
        results: searchResults,
        summary: searchResults.length > 0 
          ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} across ${Array.from(new Set(searchResults.map(r => r.type))).join(', ')} for "${query}".`
          : ''
      };
    } catch (error) {
      console.error('Abacus.ai enhancement error:', error);
      // Return original results if AI enhancement fails
      return {
        results: searchResults,
        summary: searchResults.length > 0 
          ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} across ${Array.from(new Set(searchResults.map(r => r.type))).join(', ')} for "${query}".`
          : ''
      };
    }
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

  async generateSearchInsights(query: string, results: any[]): Promise<string> {
    // Placeholder for AI-generated insights about search results
    if (results.length === 0) {
      return `No results found for "${query}". Try different keywords or check spelling.`;
    }
    
    const types = Array.from(new Set(results.map(r => r.type)));
    return `Found ${results.length} results across ${types.join(', ')} for "${query}".`;
  }

  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.deploymentToken);
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
          deploymentToken: this.config.deploymentToken,
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

// Export a default instance with the provided API key and deployment token
export const abacusAI = new AbacusAIProvider({
  apiKey: "s2_c688f51a70a74263a674a81f01d30127",
  baseUrl: "https://abacus.ai/api/v0",
  deploymentToken: process.env.ABACUS_DEPLOYMENT_TOKEN
});