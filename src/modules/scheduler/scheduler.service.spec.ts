// @ts-nocheck - Test file with mock structures
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { ReportsService } from '../reports/reports.service';
import { EmailService } from '../reports/email-service';
import { ReportScheduleService } from './report-schedule.service';
import { ReportSchedule } from 'src/entities/report-schedule.entity';
import { Report } from 'src/entities/report.entity';
import { User } from 'src/entities/user.entity';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let reportsService: ReportsService;
  let emailService: EmailService;
  let reportScheduleService: ReportScheduleService;

  const mockReportsService = {
    executeReport: jest.fn(),
  };

  const mockEmailService = {
    sendReportEmail: jest.fn(),
  };

  const mockReportScheduleService = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
  };

  const mockReportQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ReportScheduleService,
          useValue: mockReportScheduleService,
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    reportsService = module.get<ReportsService>(ReportsService);
    emailService = module.get<EmailService>(EmailService);
    reportScheduleService = module.get<ReportScheduleService>(ReportScheduleService);

    // Inject mock queue
    service.reportQueue = mockReportQueue;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scheduleReport', () => {
    it('should schedule a report successfully', async () => {
      const reportId = 'report-123';
      const userId = 'user-456';
      const parameters = { startDate: '2024-01-01' };
      const recipients = ['user@example.com'];
      const format = 'pdf';
      const scheduleTime = new Date('2024-12-31');

      const savedSchedule = {
        id: 'schedule-new',
        report: { id: reportId },
        user: { id: userId },
        parameters,
        recipients,
        format,
        scheduleTime,
        isActive: true,
      } as ReportSchedule;

      // Mock create to simulate TypeORM behavior - it mutates the input object and returns saved entity
      mockReportScheduleService.create.mockImplementation((schedule) => {
        // Simulate TypeORM setting the id on the original object
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.scheduleReport(
        reportId,
        userId,
        parameters,
        recipients,
        format,
        scheduleTime
      );

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          report: { id: reportId },
          user: { id: userId },
          parameters,
          recipients,
          format,
          scheduleTime,
          isActive: true,
        })
      );
      expect(mockReportQueue.add).toHaveBeenCalledWith('generate-scheduled-report', {
        scheduleId: 'schedule-new',
        parameters,
      });
    });

    it('should set isActive to true for new schedules', async () => {
      const scheduleTime = new Date();
      const savedSchedule = {
        id: 'schedule-1',
        isActive: true,
      } as ReportSchedule;

      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({});

      await service.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['user@example.com'],
        'html',
        scheduleTime
      );

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
    });

    it('should handle HTML format', async () => {
      const savedSchedule = { id: 'schedule-html' } as ReportSchedule;
      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({});

      await service.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['user@example.com'],
        'html',
        new Date()
      );

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'html' })
      );
    });

    it('should handle Excel format', async () => {
      const savedSchedule = { id: 'schedule-excel' } as ReportSchedule;
      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({});

      await service.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['analyst@example.com'],
        'excel',
        new Date()
      );

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'excel' })
      );
    });

    it('should handle multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com'];
      const savedSchedule = { id: 'schedule-multi' } as ReportSchedule;
      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({});

      await service.scheduleReport(
        'report-1',
        'user-1',
        {},
        recipients,
        'pdf',
        new Date()
      );

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipients })
      );
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const savedSchedule = { id: 'schedule-timestamp' } as ReportSchedule;
      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockResolvedValue({});

      await service.scheduleReport(
        'report-1',
        'user-1',
        {},
        ['user@example.com'],
        'pdf',
        new Date()
      );

      const createCall = mockReportScheduleService.create.mock.calls[0][0];
      expect(createCall.createdAt).toBeInstanceOf(Date);
      expect(createCall.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle queue add errors', async () => {
      const savedSchedule = { id: 'schedule-queue-error' } as ReportSchedule;
      const queueError = new Error('Queue error');
      mockReportScheduleService.create.mockImplementation((schedule) => {
        (schedule as any).id = savedSchedule.id;
        return Promise.resolve(savedSchedule);
      });
      mockReportQueue.add.mockRejectedValue(queueError);

      await expect(
        service.scheduleReport(
          'report-1',
          'user-1',
          {},
          ['user@example.com'],
          'pdf',
          new Date()
        )
      ).rejects.toThrow('Queue error');
    });
  });

  describe('cancelScheduledReport', () => {
    it('should cancel a scheduled report', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        isActive: true,
      } as ReportSchedule;

      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockResolvedValue(undefined),
      };

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportScheduleService.create.mockResolvedValue({ ...mockSchedule, isActive: false });
      mockReportQueue.getJob.mockResolvedValue(mockJob);

      await service.cancelScheduledReport(scheduleId);

      expect(reportScheduleService.findById).toHaveBeenCalledWith(scheduleId);
      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(mockReportQueue.getJob).toHaveBeenCalledWith(scheduleId);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should throw error when schedule not found', async () => {
      const scheduleId = 'non-existent';
      mockReportScheduleService.findById.mockResolvedValue(null);

      await expect(service.cancelScheduledReport(scheduleId)).rejects.toThrow('Schedule not found');
    });

    it('should handle case when job does not exist in queue', async () => {
      const scheduleId = 'schedule-no-job';
      const mockSchedule = {
        id: scheduleId,
        isActive: true,
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportScheduleService.create.mockResolvedValue({ ...mockSchedule, isActive: false });
      mockReportQueue.getJob.mockResolvedValue(null);

      await service.cancelScheduledReport(scheduleId);

      expect(reportScheduleService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
      );
      expect(mockReportQueue.getJob).toHaveBeenCalledWith(scheduleId);
    });

    it('should handle job removal errors gracefully', async () => {
      const scheduleId = 'schedule-remove-error';
      const mockSchedule = {
        id: scheduleId,
        isActive: true,
      } as ReportSchedule;

      const mockJob = {
        id: 'job-123',
        remove: jest.fn().mockRejectedValue(new Error('Remove failed')),
      };

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportScheduleService.create.mockResolvedValue({ ...mockSchedule, isActive: false });
      mockReportQueue.getJob.mockResolvedValue(mockJob);

      // Should still complete even if job removal fails
      await expect(service.cancelScheduledReport(scheduleId)).rejects.toThrow('Remove failed');
    });
  });

  describe('getScheduledReports', () => {
    it('should return scheduled reports for a user', async () => {
      const userId = 'user-123';
      const mockSchedules = [
        {
          id: 'schedule-1',
          user: { id: userId },
          isActive: true,
        },
        {
          id: 'schedule-2',
          user: { id: userId },
          isActive: true,
        },
      ] as ReportSchedule[];

      mockReportScheduleService.findByUserId.mockResolvedValue(mockSchedules);

      const result = await service.getScheduledReports(userId);

      expect(result).toEqual(mockSchedules);
      expect(reportScheduleService.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no schedules found', async () => {
      const userId = 'user-no-schedules';
      mockReportScheduleService.findByUserId.mockResolvedValue([]);

      const result = await service.getScheduledReports(userId);

      expect(result).toEqual([]);
    });

    it('should handle repository errors', async () => {
      const userId = 'user-error';
      const error = new Error('Database error');
      mockReportScheduleService.findByUserId.mockRejectedValue(error);

      await expect(service.getScheduledReports(userId)).rejects.toThrow('Database error');
    });
  });

  describe('getReportSchedule', () => {
    it('should return a schedule by id', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1' },
        isActive: true,
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);

      const result = await service.getReportSchedule(scheduleId);

      expect(result).toEqual(mockSchedule);
      expect(reportScheduleService.findById).toHaveBeenCalledWith(scheduleId);
    });

    it('should throw error when schedule not found', async () => {
      const scheduleId = 'non-existent';
      mockReportScheduleService.findById.mockResolvedValue(null);

      await expect(service.getReportSchedule(scheduleId)).rejects.toThrow('Schedule not found');
    });
  });

  describe('getReportData', () => {
    it('should return report data for a schedule', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1' },
        user: { id: 'user-1' },
        parameters: { startDate: '2024-01-01' },
        format: 'pdf',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      } as ReportSchedule;

      const mockReportResult = {
        content: Buffer.from('PDF content'),
        mimeType: 'application/pdf',
        fileName: 'report.pdf',
      };

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue(mockReportResult);

      const result = await service.getReportData(scheduleId);

      expect(result).toEqual({
        reportId: 'report-1',
        userId: 'user-1',
        scheduleId: 'schedule-123',
        data: mockReportResult,
        parameters: { startDate: '2024-01-01' },
        createdAt: mockSchedule.createdAt,
        updatedAt: mockSchedule.updatedAt,
      });
      expect(reportsService.executeReport).toHaveBeenCalledWith(
        'report-1',
        { startDate: '2024-01-01' },
        'pdf'
      );
    });

    it('should throw error when schedule not found', async () => {
      const scheduleId = 'non-existent';
      mockReportScheduleService.findById.mockResolvedValue(null);

      await expect(service.getReportData(scheduleId)).rejects.toThrow('Schedule not found');
    });

    it('should handle HTML format', async () => {
      const mockSchedule = {
        id: 'schedule-html',
        report: { id: 'report-1' },
        user: { id: 'user-1' },
        parameters: {},
        format: 'html',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: '<html>' });

      await service.getReportData('schedule-html');

      expect(reportsService.executeReport).toHaveBeenCalledWith('report-1', {}, 'html');
    });

    it('should handle Excel format', async () => {
      const mockSchedule = {
        id: 'schedule-excel',
        report: { id: 'report-1' },
        user: { id: 'user-1' },
        parameters: {},
        format: 'excel',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: Buffer.from('Excel') });

      await service.getReportData('schedule-excel');

      expect(reportsService.executeReport).toHaveBeenCalledWith('report-1', {}, 'excel');
    });

    it('should handle report execution errors', async () => {
      const mockSchedule = {
        id: 'schedule-error',
        report: { id: 'report-1' },
        user: { id: 'user-1' },
        parameters: {},
        format: 'pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ReportSchedule;

      const error = new Error('Report execution failed');
      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockRejectedValue(error);

      await expect(service.getReportData('schedule-error')).rejects.toThrow('Report execution failed');
    });
  });
});
