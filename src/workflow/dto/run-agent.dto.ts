import { IsString, MinLength } from 'class-validator';

export class RunAgentDto {
  @IsString()
  @MinLength(1)
  task: string;

  @IsString()
  @MinLength(1)
  agentId: string;
}
