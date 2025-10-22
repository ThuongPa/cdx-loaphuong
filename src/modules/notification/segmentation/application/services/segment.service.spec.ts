import { Test, TestingModule } from '@nestjs/testing';
import { SegmentService } from './segment.service';
import { SegmentRepository } from '../../infrastructure/segment.repository';
import { Segment } from '../../domain/segment.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SegmentService', () => {
  let service: SegmentService;
  let segmentRepository: jest.Mocked<SegmentRepository>;

  beforeEach(async () => {
    const mockSegmentRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findMany: jest.fn(),
      findActive: jest.fn(),
      findByUser: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SegmentService,
        {
          provide: 'SegmentRepository',
          useValue: mockSegmentRepository,
        },
      ],
    }).compile();

    service = module.get<SegmentService>(SegmentService);
    segmentRepository = module.get('SegmentRepository');
  });

  describe('createSegment', () => {
    it('should create a segment successfully', async () => {
      const createDto = {
        name: 'Test Segment',
        description: 'Test description',
        criteria: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
        ],
      };

      const mockSegment = Segment.create({
        name: 'Test Segment',
        description: 'Test description',
        isActive: true,
        criteria: createDto.criteria,
        createdBy: 'user123',
      });

      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.createSegment(createDto, 'user123');

      expect(result).toEqual(mockSegment);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no criteria provided', async () => {
      const createDto = {
        name: 'Test Segment',
        criteria: [],
      };

      await expect(service.createSegment(createDto, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getSegmentById', () => {
    it('should return segment if found', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);

      const result = await service.getSegmentById('segment123');

      expect(result).toEqual(mockSegment);
      expect(segmentRepository.findById).toHaveBeenCalledWith('segment123');
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.getSegmentById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSegment', () => {
    it('should update segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const updates = {
        name: 'Updated Segment',
        description: 'Updated description',
      };

      const updatedSegment = Segment.create({
        name: 'Updated Segment',
        description: 'Updated description',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(updatedSegment);

      const result = await service.updateSegment('segment123', updates);

      expect(result).toEqual(updatedSegment);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.updateSegment('nonexistent', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if criteria is empty', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);

      await expect(service.updateSegment('segment123', { criteria: [] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteSegment', () => {
    it('should delete segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.delete.mockResolvedValue(undefined);

      await service.deleteSegment('segment123');

      expect(segmentRepository.findById).toHaveBeenCalledWith('segment123');
      expect(segmentRepository.delete).toHaveBeenCalledWith('segment123');
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.deleteSegment('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateSegment', () => {
    it('should activate segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: false,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.activateSegment('segment123');

      expect(result.isActive).toBe(true);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.activateSegment('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateSegment', () => {
    it('should deactivate segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.deactivateSegment('segment123');

      expect(result.isActive).toBe(false);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateSegment('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveSegments', () => {
    it('should return active segments', async () => {
      const mockSegments = [
        Segment.create({
          name: 'Segment 1',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
        Segment.create({
          name: 'Segment 2',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
      ];

      segmentRepository.findActive.mockResolvedValue(mockSegments);

      const result = await service.getActiveSegments();

      expect(result).toEqual(mockSegments);
      expect(segmentRepository.findActive).toHaveBeenCalled();
    });
  });

  describe('addCriteria', () => {
    it('should add criteria to segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const newCriteria = {
        field: 'user.status',
        operator: 'equals' as const,
        value: 'active',
      };

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.addCriteria('segment123', newCriteria);

      expect(result).toEqual(mockSegment);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.addCriteria('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCriteria', () => {
    it('should remove criteria from segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
        ],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.removeCriteria('segment123', 0);

      expect(result).toEqual(mockSegment);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.removeCriteria('nonexistent', 0)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCriteria', () => {
    it('should update criteria in segment successfully', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
        ],
        createdBy: 'user123',
      });

      const updatedCriteria = {
        field: 'user.role',
        operator: 'equals' as const,
        value: 'admin',
      };

      segmentRepository.findById.mockResolvedValue(mockSegment);
      segmentRepository.save.mockResolvedValue(mockSegment);

      const result = await service.updateCriteria('segment123', 0, updatedCriteria);

      expect(result).toEqual(mockSegment);
      expect(segmentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.updateCriteria('nonexistent', 0, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSegmentsByUser', () => {
    it('should return segments created by user', async () => {
      const mockSegments = [
        Segment.create({
          name: 'User Segment 1',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
        Segment.create({
          name: 'User Segment 2',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
      ];

      segmentRepository.findByUser.mockResolvedValue(mockSegments);

      const result = await service.getSegmentsByUser('user123');

      expect(result).toEqual(mockSegments);
      expect(segmentRepository.findByUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('searchSegments', () => {
    it('should return matching segments', async () => {
      const mockSegments = [
        Segment.create({
          name: 'Test Segment 1',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
        Segment.create({
          name: 'Test Segment 2',
          isActive: true,
          criteria: [],
          createdBy: 'user123',
        }),
      ];

      segmentRepository.search.mockResolvedValue(mockSegments);

      const result = await service.searchSegments('test');

      expect(result).toEqual(mockSegments);
      expect(segmentRepository.search).toHaveBeenCalledWith('test');
    });
  });

  describe('bulkUpdateSegments', () => {
    it('should update multiple segments successfully', async () => {
      const mockSegment1 = Segment.create({
        name: 'Segment 1',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const mockSegment2 = Segment.create({
        name: 'Segment 2',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const updatedSegment1 = Segment.create({
        name: 'Updated Segment 1',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const updatedSegment2 = Segment.create({
        name: 'Updated Segment 2',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById
        .mockResolvedValueOnce(mockSegment1)
        .mockResolvedValueOnce(mockSegment2);

      segmentRepository.save
        .mockResolvedValueOnce(updatedSegment1)
        .mockResolvedValueOnce(updatedSegment2);

      const updates = [
        { id: 'segment1', updates: { name: 'Updated Segment 1' } },
        { id: 'segment2', updates: { name: 'Updated Segment 2' } },
      ];

      const result = await service.bulkUpdateSegments(updates);

      expect(result).toEqual([updatedSegment1, updatedSegment2]);
      expect(segmentRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('bulkDeleteSegments', () => {
    it('should delete multiple segments successfully', async () => {
      const mockSegment1 = Segment.create({
        name: 'Segment 1',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      const mockSegment2 = Segment.create({
        name: 'Segment 2',
        isActive: true,
        criteria: [],
        createdBy: 'user123',
      });

      segmentRepository.findById
        .mockResolvedValueOnce(mockSegment1)
        .mockResolvedValueOnce(mockSegment2);

      segmentRepository.delete.mockResolvedValue(undefined);

      await service.bulkDeleteSegments(['segment1', 'segment2']);

      expect(segmentRepository.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSegmentStatistics', () => {
    it('should return segment statistics', async () => {
      const mockSegment = Segment.create({
        name: 'Test Segment',
        isActive: true,
        criteria: [
          {
            field: 'user.status',
            operator: 'equals' as const,
            value: 'active',
          },
          {
            field: 'user.role',
            operator: 'equals' as const,
            value: 'admin',
          },
        ],
        createdBy: 'user123',
      });

      segmentRepository.findById.mockResolvedValue(mockSegment);

      const result = await service.getSegmentStatistics('segment123');

      expect(result).toHaveProperty('segment');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalCriteria).toBe(2);
    });

    it('should throw NotFoundException if segment not found', async () => {
      segmentRepository.findById.mockResolvedValue(null);

      await expect(service.getSegmentStatistics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
