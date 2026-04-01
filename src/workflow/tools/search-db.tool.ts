export const searchDb = async (task: string, agentId: string): Promise<string> => {
  // Extract search query from task
  const queryMatch = task.match(/(?:find|search|look for)\s+(.+)/i);
  const query = queryMatch ? queryMatch[1].trim() : task;

  // Simulate database search with structured mock results
  const mockResults = [
    { id: 1, type: 'document', title: `Result matching "${query}"`, score: 0.95 },
    { id: 2, type: 'record', title: `Related item for "${query}"`, score: 0.82 },
  ];

  const resultsCount = mockResults.length;
  const topResult = mockResults[0];

  return `Found ${resultsCount} results. Top match: "${topResult.title}" (relevance: ${topResult.score})`;
};
