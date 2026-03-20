import { DetectedIntent } from '../intent-detector';
import { searchDb } from './search-db.tool';
import { sendEmail } from './send-email.tool';

export type ToolName = 'send_email' | 'search_db';

type ToolExecutor = (task: string, agentId: string) => Promise<string>;

const toolExecutors: Record<ToolName, ToolExecutor> = {
  send_email: sendEmail,
  search_db: searchDb,
};

export const intentToolRegistry: Partial<Record<DetectedIntent, ToolName>> = {
  send_email: 'send_email',
  search_db: 'search_db',
};

export const selectToolForIntent = (intent: DetectedIntent): ToolName | null => {
  return intentToolRegistry[intent] ?? null;
};

export const executeToolByName = async (
  toolName: ToolName,
  task: string,
  agentId: string,
): Promise<string> => {
  return toolExecutors[toolName](task, agentId);
};
