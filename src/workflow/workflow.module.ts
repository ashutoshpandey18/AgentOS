import { Module } from '@nestjs/common';

import { LlmService } from './llm.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowGateway } from './workflow.gateway';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowGateway, LlmService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
