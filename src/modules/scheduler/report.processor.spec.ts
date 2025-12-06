// @ts-nocheck - Test file with mock structures
import { Test, TestingModule } from '@nestjs/testing';
import { ReportProcessor } from './report.processor';
import { ReportsService } from '../reports/reports.service';
import { EmailService } from '../reports/email-service';
import { ReportScheduleService } from './report-schedule.service';
import { ReportSchedule } from 'src/entities/report-schedule.entity';
import { Job } from 'bullmq';

describe('ReportProcessor', () => {
  let processor: ReportProcessor;
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
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportProcessor,
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

    processor = module.get<ReportProcessor>(ReportProcessor);
    reportsService = module.get<ReportsService>(ReportsService);
    emailService = module.get<EmailService>(EmailService);
    reportScheduleService = module.get<ReportScheduleService>(ReportScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleReportGeneration', () => {
    it('should process report generation job successfully', async () => {
      const scheduleId = 'schedule-123';
      const parameters = { startDate: '2024-01-01' };
      
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Test Report' },
        format: 'pdf',
        recipients: ['user@example.com'],
      } as ReportSchedule;

      const mockReportResult = {
        content: Buffer.from('PDF content'),
        mimeType: 'application/pdf',
        fileName: 'report.pdf',
      };

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue(mockReportResult);
      mockEmailService.sendReportEmail.mockResolvedValue(undefined);

      // Mock logExecution to prevent error
      jest.spyOn(processor, 'logExecution').mockImplementation(() => {});

      const mockJob = {
        data: {
          scheduleId,
          parameters,
        },
      } as Job<any>;

      await processor.handleReportGeneration(mockJob);

      expect(reportScheduleService.findById).toHaveBeenCalledWith(scheduleId);
      expect(reportsService.executeReport).toHaveBeenCalledWith(
        'report-1',
        parameters,
        'pdf'
      );
      expect(emailService.sendReportEmail).toHaveBeenCalledWith(
        ['user@example.com'],
        'Test Report',
        mockReportResult
      );
      expect(processor.logExecution).toHaveBeenCalledWith(scheduleId, 'success');
    });

    it('should handle HTML format', async () => {
      const scheduleId = 'schedule-html';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'HTML Report' },
        format: 'html',
        recipients: ['user@example.com'],
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: '<html>' });
      mockEmailService.sendReportEmail.mockResolvedValue(undefined);
      jest.spyOn(processor, 'logExecution').mockImplementation(() => {});

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await processor.handleReportGeneration(mockJob);

      expect(reportsService.executeReport).toHaveBeenCalledWith(
        'report-1',
        {},
        'html'
      );
    });

    it('should handle Excel format', async () => {
      const scheduleId = 'schedule-excel';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Excel Report' },
        format: 'excel',
        recipients: ['analyst@example.com'],
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: Buffer.from('Excel') });
      mockEmailService.sendReportEmail.mockResolvedValue(undefined);
      jest.spyOn(processor, 'logExecution').mockImplementation(() => {});

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await processor.handleReportGeneration(mockJob);

      expect(reportsService.executeReport).toHaveBeenCalledWith(
        'report-1',
        {},
        'excel'
      );
    });

    it('should handle invalid format by defaulting to undefined', async () => {
      const scheduleId = 'schedule-invalid';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Invalid Format Report' },
        format: 'invalid-format',
        recipients: ['user@example.com'],
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: 'default' });
      mockEmailService.sendReportEmail.mockResolvedValue(undefined);
      jest.spyOn(processor, 'logExecution').mockImplementation(() => {});

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await processor.handleReportGeneration(mockJob);

      expect(reportsService.executeReport).toHaveBeenCalledWith(
        'report-1',
        {},
        undefined
      );
    });

    it('should handle multiple recipients', async () => {
      const scheduleId = 'schedule-multi';
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Multi Recipient Report' },
        format: 'pdf',
        recipients,
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: Buffer.from('PDF') });
      mockEmailService.sendReportEmail.mockResolvedValue(undefined);
      jest.spyOn(processor, 'logExecution').mockImplementation(() => {});

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await processor.handleReportGeneration(mockJob);

      expect(emailService.sendReportEmail).toHaveBeenCalledWith(
        recipients,
        'Multi Recipient Report',
        expect.anything()
      );
    });

    it('should log error and rethrow when report execution fails', async () => {
      const scheduleId = 'schedule-error';
      const error = new Error('Report execution failed');
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Error Report' },
        format: 'pdf',
        recipients: ['user@example.com'],
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockRejectedValue(error);
      jest.spyOn(processor, 'logExecution').mockResolvedValue(undefined);

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await expect(processor.handleReportGeneration(mockJob)).rejects.toThrow('Report execution failed');
      expect(processor.logExecution).toHaveBeenCalledWith(scheduleId, 'failed', 'Report execution failed');
    });

    it('should log error when email sending fails', async () => {
      const scheduleId = 'schedule-email-error';
      const emailError = new Error('Email sending failed');
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1', name: 'Email Error Report' },
        format: 'html',
        recipients: ['user@example.com'],
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);
      mockReportsService.executeReport.mockResolvedValue({ content: '<html>' });
      mockEmailService.sendReportEmail.mockRejectedValue(emailError);
      jest.spyOn(processor, 'logExecution').mockResolvedValue(undefined);

      const mockJob = {
        data: { scheduleId, parameters: {} },
      } as Job<any>;

      await expect(processor.handleReportGeneration(mockJob)).rejects.toThrow('Email sending failed');
      expect(processor.logExecution).toHaveBeenCalledWith(scheduleId, 'failed', 'Email sending failed');
    });
  });

  describe('getSchedule', () => {
    it('should return schedule when found', async () => {
      const scheduleId = 'schedule-123';
      const mockSchedule = {
        id: scheduleId,
        report: { id: 'report-1' },
      } as ReportSchedule;

      mockReportScheduleService.findById.mockResolvedValue(mockSchedule);

      const result = await processor.getSchedule(scheduleId);

      expect(result).toEqual(mockSchedule);
      expect(reportScheduleService.findById).toHaveBeenCalledWith(scheduleId);
    });

    it('should throw error when schedule not found', async () => {
      const scheduleId = 'non-existent';
      mockReportScheduleService.findById.mockResolvedValue(null);

      await expect(processor.getSchedule(scheduleId)).rejects.toThrow(
        'Schedule with ID non-existent not found'
      );
    });
  });

  describe('logExecution', () => {
    it('should throw error as method is not implemented', () => {
      expect(() => {
        processor.logExecution('schedule-123', 'success');
      }).toThrow('Method not implemented.');
    });
  });
});
