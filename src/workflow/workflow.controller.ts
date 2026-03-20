import { Body, Controller, Post } from '@nestjs/common';

import { RunAgentDto } from './dto/run-agent.dto';
import { WorkflowService } from './workflow.service';

@Controller('agent')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('run')
  async run(@Body() runAgentDto: RunAgentDto) {
    return this.workflowService.runAgent(runAgentDto.task, runAgentDto.agentId);
  }
}
