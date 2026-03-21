import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

import { RunsService } from './runs.service';

@Controller()
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Get('runs/:agentId')
  getRunsByAgent(@Param('agentId', new ParseUUIDPipe()) agentId: string) {
    return this.runsService.getRunsByAgent(agentId);
  }

  @Get('run/:id')
  getRunById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.runsService.getRunById(id);
  }
}
