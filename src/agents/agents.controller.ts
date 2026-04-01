import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.findOne(id);
  }

  @Get(':id/runs')
  getAgentRuns(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.agentsService.getAgentRuns(id, query.limit, query.offset);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.agentsService.remove(id);
  }
}
