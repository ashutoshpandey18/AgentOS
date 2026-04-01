import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from './llm.service';
import { WorkflowGateway } from './workflow.gateway';
import { detectIntent, DetectedIntent } from './intent-detector';
import { executeToolByName, selectToolForIntent, ToolName } from './tools/tool.registry';

type Intent = DetectedIntent;

type WorkflowLogEntry = {
  step: string;
  message: string;
  timestamp: Date;
  isInternal?: boolean;
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
const AGENT_MODE_RULE_BASED = 'RULE_BASED';
const AGENT_MODE_LLM = 'LLM';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly workflowGateway: WorkflowGateway,
  ) {}

  async runAgent(task: string, agentId: string): Promise<WorkflowRunResponse> {
    this.validateRunInput(task, agentId);
    const agent = await this.getAgentOrThrow(agentId);

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

    try {
      // 1. Detect Intent
      state.intent = await this.detectIntentByMode(task, agent.mode, state, runRecord.id);
      this.appendLog(state, runRecord.id, 'intent', `Intent detected: ${state.intent}`);

      // 2. Select Tool
      state.tool = selectToolForIntent(state.intent);
      this.appendLog(state, runRecord.id, 'tool-selection', `Tool selected: ${state.tool ?? 'unknown'}`);

      // 3. Enforcement: Tool-Agent Permission Mapping
      if (state.tool && !this.isToolAuthorized(agent.tools, state.tool)) {
        state.result = `Security: Tool '${state.tool}' is not authorized for this agent.`;
        this.appendLog(state, runRecord.id, 'security', state.result);
        state.status = 'failed';

        await this.updateRunRecord(runRecord.id, state);
        throw new ForbiddenException(state.result);
      }

      // 4. Execute Tool
      if (!state.tool) {
        state.result = 'Unknown intent';
        this.appendLog(state, runRecord.id, 'execution', 'Unknown intent - no tool executed');
      } else {
        this.appendLog(state, runRecord.id, 'execution', 'Executing...');
        state.result = await this.executeToolWithRetry(state, runRecord.id, state.tool, task, agentId);
        this.appendLog(state, runRecord.id, 'execution', `Execution result: ${state.result}`);
        this.appendLog(state, runRecord.id, 'execution', 'Done!');
      }

      state.status = 'success';
    } catch (error) {
      if (state.status !== 'failed') {
        state.status = 'failed';
        this.appendLog(state, runRecord.id, 'execution', 'Execution failed');
      }

      await this.updateRunRecord(runRecord.id, state);

      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Agent run failed');
    }

    // Final update and WS notification
    await this.updateRunRecord(runRecord.id, state);
    this.workflowGateway.emitComplete(runRecord.id, state.result);

    return {
      status: 'success',
      result: state.result,
      logs: state.logs
        .filter((log) => !log.isInternal) // Hide internal/fallback logs from user
        .map((log) => log.message),
    };
  }

  private validateRunInput(task: string, agentId: string) {
    if (!task?.trim()) {
      throw new BadRequestException('Task is required');
    }

    if (!agentId?.trim()) {
      throw new BadRequestException('Agent ID is required');
    }
  }

  private async getAgentOrThrow(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        mode: true,
        tools: true, // Fetch authorized tools
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with id '${agentId}' was not found`);
    }

    return agent;
  }

  private async executeTool(tool: ToolName, task: string, agentId: string): Promise<string> {
    return executeToolByName(tool, task, agentId);
  }

  private async detectIntentByMode(
    task: string,
    mode: string,
    state: WorkflowState,
    runId: string,
  ): Promise<DetectedIntent> {
    if (this.normalizeMode(mode) === AGENT_MODE_LLM) {
      this.appendLog(state, runId, 'intent', 'Intent detection method: LLM', true);
      try {
        return await this.llmService.detectIntentWithLLM(task);
      } catch (error) {
        this.appendLog(state, runId, 'intent', 'LLM failed, fallback used', true);
      }

      return detectIntent(task);
    }

    this.appendLog(state, runId, 'intent', 'Intent detection method: RULE_BASED', true);

    return detectIntent(task);
  }

  private normalizeMode(mode: string): string {
    const normalized = mode.trim().toUpperCase().replace('-', '_');

    if (normalized === 'RULE_BASED' || normalized === 'RULE') {
      return AGENT_MODE_RULE_BASED;
    }

    if (normalized === 'LLM') {
      return AGENT_MODE_LLM;
    }

    return AGENT_MODE_RULE_BASED;
  }

  private async executeToolWithRetry(
    state: WorkflowState,
    runId: string,
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
          runId,
          'retry',
          `Tool failed on attempt ${attemptNumber}/${maxAttempts}. Retrying (${attemptNumber}/${MAX_TOOL_RETRIES})...`,
        );
      }
    }

    throw new InternalServerErrorException('Tool execution failed');
  }

private appendLog(state: WorkflowState, runId: string, step: string, message: string, isInternal = false) {
    const entry = this.createLog(step, message, isInternal);
    state.logs.push(entry);

    // Only emit non-internal logs to WebSocket
    if (!isInternal) {
      this.workflowGateway.emitLog(runId, entry.message);
    }
  }

  private createLog(step: string, message: string, isInternal = false): WorkflowLogEntry {
    return {
      step,
      message,
      timestamp: new Date(),
      isInternal,
    };
  }

  private isToolAuthorized(agentTools: any, selectedTool: string): boolean {
    if (Array.isArray(agentTools)) {
      return agentTools.includes(selectedTool);
    }
    return false;
  }

  private async updateRunRecord(runId: string, state: WorkflowState) {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: state.status,
        result: state.result,
        logs: state.logs,
      } as any,
    });
  }

  async getRunById(runId: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        agentId: true,
        task: true,
        result: true,
        status: true,
        logs: true,
        createdAt: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Run with id '${runId}' was not found`);
    }

    return run;
  }
}
