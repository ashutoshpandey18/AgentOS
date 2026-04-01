import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RunAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  task: string;

  @IsUUID()
  agentId: string;
}
