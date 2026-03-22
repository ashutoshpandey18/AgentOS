import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DetectedIntent } from './intent-detector';

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const VALID_INTENTS: readonly DetectedIntent[] = ['send_email', 'search_db', 'unknown'];

@Injectable()
export class LlmService {
  constructor(private readonly configService: ConfigService) {}

  async detectIntentWithLLM(task: string): Promise<DetectedIntent> {
    const groqApiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'Classify the task into ONE of: send_email, search_db, unknown. Only return one word.',
          },
          {
            role: 'user',
            content: task,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GroqChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '';

    if (!this.isValidIntent(content)) {
      throw new Error('Groq returned invalid intent');
    }

    return content;
  }

  private isValidIntent(value: string): value is DetectedIntent {
    return VALID_INTENTS.includes(value as DetectedIntent);
  }
}
