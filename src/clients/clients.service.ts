import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, ClientResponseDto, ClientFilterDto } from '../common/dto/client.dto';
import { Client, Prisma } from '@prisma/client';
import { API_CONSTANTS } from '../common/constants';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createClient(createClientDto: CreateClientDto): Promise<Client> {
    return this.prisma.client.create({
      data: {
        name: createClientDto.name,
        email: createClientDto.email,
        phone: createClientDto.phone,
        assignedSeller: createClientDto.assignedSeller,
        meetingDate: new Date(createClientDto.meetingDate),
        closed: createClientDto.closed,
        transcription: createClientDto.transcription,
      },
    });
  }

  async createManyClients(clients: CreateClientDto[]): Promise<{ count: number }> {
    const data = clients.map((client) => ({
      name: client.name,
      email: client.email,
      phone: client.phone,
      assignedSeller: client.assignedSeller,
      meetingDate: new Date(client.meetingDate),
      closed: client.closed,
      transcription: client.transcription,
    }));

    return this.prisma.client.createMany({
      data,
      skipDuplicates: true, // Skip if email already exists
    });
  }

  async findAll(filters: ClientFilterDto = {}): Promise<{ clients: Client[]; total: number; page: number; limit: number }> {
    const page = filters.page || API_CONSTANTS.PAGINATION.DEFAULT_PAGE;
    const limit = filters.limit || API_CONSTANTS.PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where: Prisma.ClientWhereInput = {};

    if (filters.assignedSeller) {
      where.assignedSeller = filters.assignedSeller;
    }

    if (filters.industry) {
      where.industry = filters.industry;
    }

    if (filters.closed !== undefined) {
      where.closed = filters.closed;
    }

    if (filters.sentiment) {
      where.sentiment = filters.sentiment;
    }

    if (filters.discoverySource) {
      where.discoverySource = filters.discoverySource;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { transcription: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { meetingDate: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { clients, total, page, limit };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async deleteAll(): Promise<{ count: number }> {
    return this.prisma.client.deleteMany({});
  }

  async getUnprocessedClients(): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { processed: false },
    });
  }

  async markAsProcessed(id: string, categorizedData: Prisma.ClientUpdateInput): Promise<Client> {
    return this.prisma.client.update({
      where: { id },
      data: {
        ...categorizedData,
        processed: true,
        processedAt: new Date(),
      },
    });
  }

  async getUniqueValues(): Promise<{
    sellers: string[];
    industries: string[];
    sentiments: string[];
    discoverySources: string[];
  }> {
    const clients = await this.prisma.client.findMany({
      select: {
        assignedSeller: true,
        industry: true,
        sentiment: true,
        discoverySource: true,
      },
    });

    const sellers = [...new Set(clients.map(c => c.assignedSeller))].sort();
    
    const industriesFiltered = clients.map(c => c.industry).filter((v): v is string => v !== null);
    const industries = [...new Set(industriesFiltered)].sort();
    
    const sentimentsFiltered = clients.map(c => c.sentiment).filter((v): v is string => v !== null);
    const sentiments = [...new Set(sentimentsFiltered)].sort();
    
    const discoverySourcesFiltered = clients.map(c => c.discoverySource).filter((v): v is string => v !== null);
    const discoverySources = [...new Set(discoverySourcesFiltered)].sort();

    return {
      sellers,
      industries,
      sentiments,
      discoverySources,
    };
  }
}

