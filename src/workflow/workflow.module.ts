import { Module } from '@nestjs/common';

import { WorkflowController } from './workflow.controller';
import { WorkflowGateway } from './workflow.gateway';
import { WorkflowService } from './workflow.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowGateway],
  exports: [WorkflowService],
})
export class WorkflowModule {}
