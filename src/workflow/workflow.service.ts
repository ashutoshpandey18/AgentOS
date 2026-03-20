import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { detectIntent, DetectedIntent } from './intent-detector';
import { executeToolByName, selectToolForIntent, ToolName } from './tools/tool.registry';

type Intent = DetectedIntent;

type WorkflowLogEntry = {
  step: string;
  message: string;
  timestamp: Date;
};

type WorkflowRunInternal = {
  agentId: string;
  task: string;
  intent: Intent;
  tool: ToolName | null;
  result: string;
  logs: WorkflowLogEntry[];
};

type WorkflowRunResponse = {
  status: 'success';
  result: string;
  logs: string[];
};

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async runAgent(task: string, agentId: string): Promise<WorkflowRunResponse> {
    if (!task?.trim()) {
      throw new BadRequestException('Task is required');
    }

    if (!agentId?.trim()) {
      throw new BadRequestException('Agent ID is required');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with id '${agentId}' was not found`);
    }

    const logs: WorkflowLogEntry[] = [];

    const intent = detectIntent(task);
    logs.push(this.createLog('intent', `Intent detected: ${intent}`));

    const tool = selectToolForIntent(intent);
    logs.push(this.createLog('tool-selection', `Tool selected: ${tool ?? 'unknown'}`));

    let result = 'Unknown intent';

    if (!tool) {
      logs.push(this.createLog('execution', 'Unknown intent - no tool executed'));
    } else {
      result = await this.executeTool(tool, task, agentId);
      logs.push(this.createLog('execution', 'Execution successful'));
    }

    const run: WorkflowRunInternal = {
      agentId,
      task,
      intent,
      tool,
      result,
      logs,
    };

    await this.prisma.agentRun.create({
      data: {
        agentId: run.agentId,
        task: run.task,
        result: run.result,
        logs: run.logs,
      },
    });

    return {
      status: 'success',
      result: run.result,
      logs: run.logs.map((log) => log.message),
    };
  }

  private async executeTool(tool: ToolName, task: string, agentId: string): Promise<string> {
    return executeToolByName(tool, task, agentId);
  }

  private createLog(step: string, message: string): WorkflowLogEntry {
    return {
      step,
      message,
      timestamp: new Date(),
    };
  }
}
