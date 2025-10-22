import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Segment } from '../../domain/segment.entity';
import { SegmentRepository } from '../../infrastructure/segment.repository';

export interface CreateSegmentDto {
  name: string;
  description?: string;
  criteria: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'less_than'
      | 'contains'
      | 'regex'
      | 'in'
      | 'not_in'
      | 'exists'
      | 'not_exists';
    value: any;
    logic?: 'and' | 'or';
  }>;
  metadata?: Record<string, any>;
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  criteria?: Array<{
    field: string;
    operator:
      | 'equals'
      | 'not_equals'
      | 'greater_than'
      | 'less_than'
      | 'contains'
      | 'regex'
      | 'in'
      | 'not_in'
      | 'exists'
      | 'not_exists';
    value: any;
    logic?: 'and' | 'or';
  }>;
  metadata?: Record<string, any>;
}

export interface SegmentQuery {
  search?: string;
  isActive?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SegmentService {
  private readonly logger = new Logger(SegmentService.name);

  constructor(
    @Inject('SegmentRepository')
    private readonly segmentRepository: SegmentRepository,
  ) {}

  async createSegment(dto: CreateSegmentDto, createdBy: string): Promise<Segment> {
    this.logger.log(`Creating segment: ${dto.name}`);

    try {
      // Validate criteria
      if (!dto.criteria || dto.criteria.length === 0) {
        throw new BadRequestException('Segment must have at least one criteria');
      }

      const segment = Segment.create({
        name: dto.name,
        description: dto.description,
        isActive: true,
        criteria: dto.criteria,
        metadata: dto.metadata,
        createdBy,
      });

      const savedSegment = await this.segmentRepository.save(segment);

      this.logger.log(`Segment created: ${savedSegment.name} (${savedSegment.id})`);
      return savedSegment;
    } catch (error) {
      this.logger.error(`Failed to create segment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSegments(
    query: SegmentQuery = {},
  ): Promise<{ segments: Segment[]; total: number; page: number; limit: number }> {
    return await this.segmentRepository.findMany(query);
  }

  async getSegmentById(id: string): Promise<Segment> {
    const segment = await this.segmentRepository.findById(id);
    if (!segment) {
      throw new NotFoundException(`Segment with ID '${id}' not found`);
    }
    return segment;
  }

  async getSegmentByName(name: string): Promise<Segment | null> {
    return await this.segmentRepository.findByName(name);
  }

  async updateSegment(id: string, dto: UpdateSegmentDto): Promise<Segment> {
    const segment = await this.getSegmentById(id);

    // Validate criteria if provided
    if (dto.criteria && dto.criteria.length === 0) {
      throw new BadRequestException('Segment must have at least one criteria');
    }

    segment.updateContent(dto);
    return await this.segmentRepository.save(segment);
  }

  async deleteSegment(id: string): Promise<void> {
    const segment = await this.getSegmentById(id);
    await this.segmentRepository.delete(id);
    this.logger.log(`Segment deleted: ${segment.name} (${segment.id})`);
  }

  async activateSegment(id: string): Promise<Segment> {
    const segment = await this.getSegmentById(id);
    segment.activate();
    return await this.segmentRepository.save(segment);
  }

  async deactivateSegment(id: string): Promise<Segment> {
    const segment = await this.getSegmentById(id);
    segment.deactivate();
    return await this.segmentRepository.save(segment);
  }

  async getActiveSegments(): Promise<Segment[]> {
    return await this.segmentRepository.findActive();
  }

  async addCriteria(id: string, criteria: any): Promise<Segment> {
    const segment = await this.getSegmentById(id);
    segment.addCriteria(criteria);
    return await this.segmentRepository.save(segment);
  }

  async removeCriteria(id: string, index: number): Promise<Segment> {
    const segment = await this.getSegmentById(id);
    segment.removeCriteria(index);
    return await this.segmentRepository.save(segment);
  }

  async updateCriteria(id: string, index: number, criteria: any): Promise<Segment> {
    const segment = await this.getSegmentById(id);
    segment.updateCriteria(index, criteria);
    return await this.segmentRepository.save(segment);
  }

  async getSegmentsByUser(userId: string): Promise<Segment[]> {
    return await this.segmentRepository.findByUser(userId);
  }

  async searchSegments(searchTerm: string): Promise<Segment[]> {
    return await this.segmentRepository.search(searchTerm);
  }

  async bulkUpdateSegments(
    updateItems: Array<{ id: string; updates: UpdateSegmentDto }>,
  ): Promise<Segment[]> {
    const results: Segment[] = [];

    for (const { id, updates } of updateItems) {
      try {
        const updatedSegment = await this.updateSegment(id, updates);
        results.push(updatedSegment);
      } catch (error) {
        this.logger.error(`Failed to update segment ${id}: ${error.message}`);
        throw error;
      }
    }

    return results;
  }

  async bulkDeleteSegments(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteSegment(id);
      } catch (error) {
        this.logger.error(`Failed to delete segment ${id}: ${error.message}`);
        throw error;
      }
    }
  }

  async getSegmentStatistics(id: string): Promise<any> {
    const segment = await this.getSegmentById(id);

    return {
      segment: {
        id: segment.id,
        name: segment.name,
        isActive: segment.isActive,
      },
      statistics: {
        totalCriteria: segment.criteria.length,
        lastUpdated: segment.updatedAt,
      },
    };
  }
}
