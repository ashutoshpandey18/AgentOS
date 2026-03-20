export type DetectedIntent = 'send_email' | 'search_db' | 'unknown';

export const detectIntent = (task: string): DetectedIntent => {
  const normalizedTask = task.toLowerCase();

  if (normalizedTask.includes('email')) {
    return 'send_email';
  }

  if (normalizedTask.includes('find') || normalizedTask.includes('search')) {
    return 'search_db';
  }

  return 'unknown';
};
