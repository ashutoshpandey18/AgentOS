export const sendEmail = async (task: string, agentId: string): Promise<string> => {
  // Extract email details from task using basic parsing
  const emailMatch = task.match(/(?:to|email)\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/i);
  const recipientEmail = emailMatch ? emailMatch[1] : 'recipient@example.com';

  // Simulate email sending with structured response
  const emailData = {
    to: recipientEmail,
    subject: `Task from Agent ${agentId.substring(0, 8)}`,
    body: task,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };

  return `Email sent to ${emailData.to} at ${emailData.sentAt}`;
};
