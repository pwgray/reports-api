import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportParameterService } from './report-parameter.service';
import { ReportParameter } from 'src/entities/report-parameter.entity';

describe('ReportParameterService', () => {
  let service: ReportParameterService;
  let repository: Repository<ReportParameter>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportParameterService,
        {
          provide: getRepositoryToken(ReportParameter),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReportParameterService>(ReportParameterService);
    repository = module.get<Repository<ReportParameter>>(getRepositoryToken(ReportParameter));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByReportId', () => {
    it('should return parameters for a given report ID', async () => {
      const reportId = 'report-123';
      const mockParameters = [
        {
          id: 'param-1',
          name: 'startDate',
          type: 'date',
          required: true,
          report: { id: reportId },
        },
        {
          id: 'param-2',
          name: 'endDate',
          type: 'date',
          required: true,
          report: { id: reportId },
        },
      ] as ReportParameter[];

      mockRepository.find.mockResolvedValue(mockParameters);

      const result = await service.findByReportId(reportId);

      expect(result).toEqual(mockParameters);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { report: { id: reportId } },
      });
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no parameters found', async () => {
      const reportId = 'report-no-params';
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByReportId(reportId);

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { report: { id: reportId } },
      });
    });

    it('should handle repository errors', async () => {
      const reportId = 'report-error';
      const error = new Error('Database connection error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findByReportId(reportId)).rejects.toThrow('Database connection error');
    });

    it('should find parameters with different types', async () => {
      const reportId = 'report-456';
      const mockParameters = [
        {
          id: 'param-1',
          name: 'status',
          type: 'string',
          required: false,
          report: { id: reportId },
        },
        {
          id: 'param-2',
          name: 'count',
          type: 'number',
          required: true,
          report: { id: reportId },
        },
        {
          id: 'param-3',
          name: 'includeArchived',
          type: 'boolean',
          required: false,
          report: { id: reportId },
        },
      ] as ReportParameter[];

      mockRepository.find.mockResolvedValue(mockParameters);

      const result = await service.findByReportId(reportId);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('string');
      expect(result[1].type).toBe('number');
      expect(result[2].type).toBe('boolean');
    });

    it('should handle UUID format report IDs', async () => {
      const reportId = '550e8400-e29b-41d4-a716-446655440000';
      mockRepository.find.mockResolvedValue([]);

      await service.findByReportId(reportId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { report: { id: reportId } },
      });
    });
  });
});
