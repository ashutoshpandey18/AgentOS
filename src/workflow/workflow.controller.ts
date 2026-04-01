import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';

import { RunAgentDto } from './dto/run-agent.dto';
import { WorkflowService } from './workflow.service';

@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('agent/run')
  async run(@Body() runAgentDto: RunAgentDto) {
    return this.workflowService.runAgent(runAgentDto.task, runAgentDto.agentId);
  }

  @Get('runs/:runId')
  async getRunById(@Param('runId', new ParseUUIDPipe()) runId: string) {
    return this.workflowService.getRunById(runId);
  }
}
