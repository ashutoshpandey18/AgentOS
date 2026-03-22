import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const AGENT_MODES = ['rule-based', 'llm', 'RULE_BASED', 'LLM'] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

export class CreateAgentDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  tools: unknown[];

  @IsString()
  @IsIn(AGENT_MODES)
  mode: AgentMode;
}
