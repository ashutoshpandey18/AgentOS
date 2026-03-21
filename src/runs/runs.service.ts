import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRunsByAgent(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with id '${agentId}' was not found`);
    }

    return this.prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: {
        task: true,
        result: true,
        logs: true,
      },
    });
  }

  async getRunById(runId: string) {
    const run = await this.prisma.agentRun.findUnique({
      where: { id: runId },
      select: {
        task: true,
        result: true,
        logs: true,
      },
    });

    if (!run) {
      throw new NotFoundException(`Run with id '${runId}' was not found`);
    }

    return run;
  }
}
