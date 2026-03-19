import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAgentDto: CreateAgentDto) {
    const agent = await this.prisma.agent.create({
      data: {
        name: createAgentDto.name,
        description: createAgentDto.description,
        tools: createAgentDto.tools as Prisma.InputJsonValue,
        mode: createAgentDto.mode,
      },
    });

    return agent;
  }

  async findAll() {
    return this.prisma.agent.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with id '${id}' was not found`);
    }

    return agent;
  }

  async remove(id: string) {
    try {
      return await this.prisma.agent.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Agent with id '${id}' was not found`);
      }

      throw error;
    }
  }
}
