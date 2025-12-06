import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportScheduleService } from './report-schedule.service';
import { ReportSchedule } from 'src/entities/report-schedule.entity';

describe('ReportScheduleService', () => {
  let service: ReportScheduleService;
  let repository: Repository<ReportSchedule>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportScheduleService,
        {
          provide: getRepositoryToken(ReportSchedule),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReportScheduleService>(ReportScheduleService);
    repository = module.get<Repository<ReportSchedule>>(getRepositoryToken(ReportSchedule));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if repository is not initialized', () => {
    // This tests the constructor validation
    expect(() => {
      new ReportScheduleService(null as any);
    }).toThrow('reportScheduleRepository is not initialized');
  });

  describe('findByReportId', () => {
    it('should return schedules for a given report ID', async () => {
      const reportId = 'report-123';
      const mockSchedules = [
        {
          id: 'schedule-1',
          report: { id: reportId },
          isActive: true,
        },
        {
          id: 'schedule-2',
          report: { id: reportId },
          isActive: false,
        },
      ] as ReportSchedule[];

      mockRepository.find.mockResolvedValue(mockSchedules);

      const result = await service.findByReportId(reportId);

      expect(result).toEqual(mockSchedules);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { report: { id: reportId } },
        relations: ['report'],
      });
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no schedules found', async () => {
      const reportId = 'report-no-schedules';
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByReportId(reportId);

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { report: { id: reportId } },
        relations: ['report'],
      });
    });

    it('should handle repository errors', async () => {
      const reportId = 'report-error';
      const error = new Error('Database connection error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findByReportId(reportId)).rejects.toThrow('Database connection error');
    });
  });

  describe('findByUserId', () => {
    it('should return active schedules for a given user ID', async () => {
      const userId = 'user-123';
      const mockSchedules = [
        {
          id: 'schedule-1',
          user: { id: userId },
          isActive: true,
          report: { id: 'report-1' },
        },
        {
          id: 'schedule-2',
          user: { id: userId },
          isActive: true,
          report: { id: 'report-2' },
        },
      ] as ReportSchedule[];

      mockRepository.find.mockResolvedValue(mockSchedules);

      const result = await service.findByUserId(userId);

      expect(result).toEqual(mockSchedules);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId }, isActive: true },
        relations: ['report', 'user'],
      });
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should only return active schedules', async () => {
      const userId = 'user-456';
      const mockSchedules = [
        {
          id: 'schedule-active',
          user: { id: userId },
          isActive: true,
        },
      ] as ReportSchedule[];

      mockRepository.find.mockResolvedValue(mockSchedules);

      const result = await service.findByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should return empty array when no active schedules found', async () => {
      const userId = 'user-no-schedules';
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new schedule', async () => {
      const scheduleData = {
        report: { id: 'report-1' },
        user: { id: 'user-1' },
        format: 'pdf',
        scheduleTime: new Date(),
      } as Partial<ReportSchedule>;

      const createdSchedule = {
        id: 'schedule-new',
        ...scheduleData,
        createdAt: new Date(),
      } as ReportSchedule;

      mockRepository.create.mockReturnValue(createdSchedule);
      mockRepository.save.mockResolvedValue(createdSchedule);

      const result = await service.create(scheduleData);

      expect(result).toEqual(createdSchedule);
      expect(mockRepository.create).toHaveBeenCalledWith(scheduleData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdSchedule);
    });

    it('should handle partial schedule data', async () => {
      const partialData = {
        format: 'html',
      } as Partial<ReportSchedule>;

      const createdSchedule = {
        id: 'schedule-partial',
        ...partialData,
      } as ReportSchedule;

      mockRepository.create.mockReturnValue(createdSchedule);
      mockRepository.save.mockResolvedValue(createdSchedule);

      const result = await service.create(partialData);

      expect(result).toEqual(createdSchedule);
    });

    it('should handle save errors', async () => {
      const scheduleData = {} as Partial<ReportSchedule>;
      const error = new Error('Save failed');
      
      mockRepository.create.mockReturnValue({} as ReportSchedule);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(scheduleData)).rejects.toThrow('Save failed');
    });
  });

  describe('findById', () => {
    it('should return a schedule by id', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1' },
        isActive: true,
      } as ReportSchedule;

      mockRepository.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findById(scheduleId);

      expect(result).toEqual(mockSchedule);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId },
        relations: ['report'],
      });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when schedule not found', async () => {
      const scheduleId = 'non-existent';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(scheduleId);

      expect(result).toBeNull();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId },
        relations: ['report'],
      });
    });

    it('should handle repository errors', async () => {
      const scheduleId = 'schedule-error';
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findById(scheduleId)).rejects.toThrow('Database error');
    });
  });
});
