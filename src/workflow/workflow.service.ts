import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { WorkflowGateway } from './workflow.gateway';
import { detectIntent, DetectedIntent } from './intent-detector';
import { executeToolByName, selectToolForIntent, ToolName } from './tools/tool.registry';

type Intent = DetectedIntent;

type WorkflowLogEntry = {
  step: string;
  message: string;
  timestamp: Date;
};

type WorkflowStatus = 'running' | 'success' | 'failed';

type WorkflowState = {
  status: WorkflowStatus;
  intent: Intent | null;
  tool: ToolName | null;
  result: string;
  logs: WorkflowLogEntry[];
};

type WorkflowRunResponse = {
  status: 'success';
  result: string;
  logs: string[];
};

const MAX_TOOL_RETRIES = 2;

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowGateway: WorkflowGateway,
  ) {}

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

    const state: WorkflowState = {
      status: 'running',
      intent: null,
      tool: null,
      result: 'Unknown intent',
      logs: [],
    };

    const runRecord = await this.prisma.agentRun.create({
      data: {
        agentId,
        task,
        status: state.status,
        result: state.result,
        logs: state.logs,
      } as any,
      select: {
        id: true,
      },
    });

    state.intent = detectIntent(task);
    this.appendLog(state, 'intent', `Intent detected: ${state.intent}`);

    state.tool = selectToolForIntent(state.intent);
    this.appendLog(state, 'tool-selection', `Tool selected: ${state.tool ?? 'unknown'}`);

    try {
      if (!state.tool) {
        this.appendLog(state, 'execution', 'Done! Unknown intent - no tool executed');
      } else {
        this.appendLog(state, 'execution', 'Executing...');
        state.result = await this.executeToolWithRetry(state, state.tool, task, agentId);
        this.appendLog(state, 'execution', 'Done!');
      }

      state.status = 'success';
    } catch (error) {
      state.status = 'failed';
      this.appendLog(state, 'execution', 'Execution failed');
      await this.prisma.agentRun.update({
        where: { id: runRecord.id },
        data: {
          status: state.status,
          result: state.result,
          logs: state.logs,
        } as any,
      });
      throw new InternalServerErrorException('Agent run failed');
    }

    await this.prisma.agentRun.update({
      where: { id: runRecord.id },
      data: {
        status: state.status,
        result: state.result,
        logs: state.logs,
      } as any,
    });

    this.workflowGateway.emitComplete(state.result);

    return {
      status: 'success',
      result: state.result,
      logs: state.logs.map((log) => log.message),
    };
  }

  private async executeTool(tool: ToolName, task: string, agentId: string): Promise<string> {
    return executeToolByName(tool, task, agentId);
  }

  private async executeToolWithRetry(
    state: WorkflowState,
    tool: ToolName,
    task: string,
    agentId: string,
  ): Promise<string> {
    for (let attempt = 0; attempt <= MAX_TOOL_RETRIES; attempt += 1) {
      try {
        return await this.executeTool(tool, task, agentId);
      } catch (error) {
        const attemptNumber = attempt + 1;
        const maxAttempts = MAX_TOOL_RETRIES + 1;
        const isLastAttempt = attempt === MAX_TOOL_RETRIES;

        if (isLastAttempt) {
          throw error;
        }

        this.appendLog(
          state,
          'retry',
          `Tool failed on attempt ${attemptNumber}/${maxAttempts}. Retrying (${attemptNumber}/${MAX_TOOL_RETRIES})...`,
        );
      }
    }

    throw new InternalServerErrorException('Tool execution failed');
  }

  private appendLog(state: WorkflowState, step: string, message: string) {
    const entry = this.createLog(step, message);
    state.logs.push(entry);
    this.workflowGateway.emitLog(entry.message);
  }

  private createLog(step: string, message: string): WorkflowLogEntry {
    return {
      step,
      message,
      timestamp: new Date(),
    };
  }
}
