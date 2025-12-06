// @ts-nocheck - Test file with mock structures
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { ReportSchedule } from 'src/entities/report-schedule.entity';

describe('SchedulerController', () => {
  let controller: SchedulerController;
  let service: SchedulerService;

  const mockSchedulerService = {
    scheduleReport: jest.fn(),
    cancelScheduledReport: jest.fn(),
    getScheduledReports: jest.fn(),
    getReportSchedule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: SchedulerService,
          useValue: mockSchedulerService,
        },
      ],
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
    service = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('scheduleReport', () => {
    it('should schedule a report', async () => {
      const reportId = 'report-123';
      const userId = 'user-456';
      const parameters = { startDate: '2024-01-01' };
      const recipients = ['user@example.com'];
      const format = 'pdf';
      const scheduleTime = new Date('2024-12-31');

      mockSchedulerService.scheduleReport.mockResolvedValue(undefined);

      await controller.scheduleReport(
        reportId,
        userId,
        parameters,
        recipients,
        format,
        scheduleTime
      );

      expect(service.scheduleReport).toHaveBeenCalledWith(
        reportId,
        userId,
        parameters,
        recipients,
        format,
        scheduleTime
      );
      expect(service.scheduleReport).toHaveBeenCalledTimes(1);
    });

    it('should handle HTML format', async () => {
      const scheduleTime = new Date();
      mockSchedulerService.scheduleReport.mockResolvedValue(undefined);

      await controller.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['user@example.com'],
        'html',
        scheduleTime
      );

      expect(service.scheduleReport).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        {},
        ['user@example.com'],
        'html',
        scheduleTime
      );
    });

    it('should handle Excel format', async () => {
      const scheduleTime = new Date();
      mockSchedulerService.scheduleReport.mockResolvedValue(undefined);

      await controller.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['analyst@example.com'],
        'excel',
        scheduleTime
      );

      expect(service.scheduleReport).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        {},
        ['analyst@example.com'],
        'excel',
        scheduleTime
      );
    });

    it('should handle multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const scheduleTime = new Date();
      mockSchedulerService.scheduleReport.mockResolvedValue(undefined);

      await controller.scheduleReport(
        'report-1',
        'user-1',
        {},
        recipients,
        'pdf',
        scheduleTime
      );

      expect(service.scheduleReport).toHaveBeenCalledWith(
        'report-1',
        'user-1',
        {},
        recipients,
        'pdf',
        scheduleTime
      );
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Scheduling failed');
      mockSchedulerService.scheduleReport.mockRejectedValue(error);

      await expect(
        controller.scheduleReport(
          'report-1',
          'user-1',
          {},
          ['user@example.com'],
          'pdf',
          new Date()
        )
      ).rejects.toThrow('Scheduling failed');
    });
  });

  describe('cancelScheduledReport', () => {
    it('should cancel a scheduled report', async () => {
      const scheduleId = 'schedule-123';
      mockSchedulerService.cancelScheduledReport.mockResolvedValue(undefined);

      await controller.cancelScheduledReport(scheduleId);

      expect(service.cancelScheduledReport).toHaveBeenCalledWith(scheduleId);
      expect(service.cancelScheduledReport).toHaveBeenCalledTimes(1);
    });

    it('should handle cancellation of non-existent schedule', async () => {
      const error = new Error('Schedule not found');
      mockSchedulerService.cancelScheduledReport.mockRejectedValue(error);

      await expect(controller.cancelScheduledReport('non-existent')).rejects.toThrow(
        'Schedule not found'
      );
    });
  });

  describe('getScheduledReports', () => {
    it('should return scheduled reports for a user', async () => {
      const userId = 'user-123';
      const mockSchedules = [
        {
          id: 'schedule-1',
          report: { id: 'report-1' },
          isActive: true,
        },
        {
          id: 'schedule-2',
          report: { id: 'report-2' },
          isActive: true,
        },
      ] as ReportSchedule[];

      mockSchedulerService.getScheduledReports.mockResolvedValue(mockSchedules);

      const result = await controller.getScheduledReports(userId);

      expect(result).toEqual(mockSchedules);
      expect(service.getScheduledReports).toHaveBeenCalledWith(userId);
      expect(service.getScheduledReports).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no schedules found', async () => {
      const userId = 'user-no-schedules';
      mockSchedulerService.getScheduledReports.mockResolvedValue([]);

      const result = await controller.getScheduledReports(userId);

      expect(result).toEqual([]);
      expect(service.getScheduledReports).toHaveBeenCalledWith(userId);
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Database error');
      mockSchedulerService.getScheduledReports.mockRejectedValue(error);

      await expect(controller.getScheduledReports('user-1')).rejects.toThrow('Database error');
    });
  });

  describe('getReportSchedule', () => {
    it('should return a single schedule by id', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1' },
        isActive: true,
      } as ReportSchedule;

      mockSchedulerService.getReportSchedule.mockResolvedValue(mockSchedule);

      const result = await controller.getReportSchedule(scheduleId);

      expect(result).toEqual(mockSchedule);
      expect(service.getReportSchedule).toHaveBeenCalledWith(scheduleId);
      expect(service.getReportSchedule).toHaveBeenCalledTimes(1);
    });

    it('should throw error when schedule not found', async () => {
      const error = new Error('Schedule not found');
      mockSchedulerService.getReportSchedule.mockRejectedValue(error);

      await expect(controller.getReportSchedule('non-existent')).rejects.toThrow(
        'Schedule not found'
      );
    });

    it('should handle different schedule ID formats', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      const mockSchedule = { id: uuidId } as ReportSchedule;
      mockSchedulerService.getReportSchedule.mockResolvedValue(mockSchedule);

      await controller.getReportSchedule(uuidId);

      expect(service.getReportSchedule).toHaveBeenCalledWith(uuidId);
    });
  });
});
