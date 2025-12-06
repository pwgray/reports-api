import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email-service';
import { ReportResult } from 'src/types/report-result.type';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendReportEmail', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.useFakeTimers();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should send email to single recipient', async () => {
      const recipients = ['user@example.com'];
      const reportName = 'Monthly Sales Report';
      const reportResult: ReportResult = {
        content: 'Report content',
        mimeType: 'text/html',
        fileName: 'report.html',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Sending report "Monthly Sales Report" to user@example.com'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Report data:', reportResult);
      expect(consoleLogSpy).toHaveBeenCalledWith('Email sent successfully');
    });

    it('should send email to multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const reportName = 'Quarterly Report';
      const reportResult: ReportResult = {
        content: Buffer.from('PDF content'),
        mimeType: 'application/pdf',
        fileName: 'report.pdf',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      jest.advanceTimersByTime(1000);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Sending report "Quarterly Report" to user1@example.com, user2@example.com, user3@example.com'
      );
    });

    it('should handle empty recipients array', async () => {
      const recipients: string[] = [];
      const reportName = 'Empty Recipients Report';
      const reportResult: ReportResult = {
        content: 'Content',
        mimeType: 'text/html',
        fileName: 'report.html',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      jest.advanceTimersByTime(1000);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Sending report "Empty Recipients Report" to '
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Email sent successfully');
    });

    it('should wait approximately 1 second before completing', async () => {
      const recipients = ['test@example.com'];
      const reportName = 'Test Report';
      const reportResult: ReportResult = {
        content: 'Test content',
        mimeType: 'text/html',
        fileName: 'test.html',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      // Verify it hasn't completed yet
      jest.advanceTimersByTime(500);
      
      // Complete the timeout
      jest.advanceTimersByTime(500);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith('Email sent successfully');
    });

    it('should handle Excel report format', async () => {
      const recipients = ['analyst@example.com'];
      const reportName = 'Data Export';
      const reportResult: ReportResult = {
        content: Buffer.from('Excel content'),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: 'export.xlsx',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      jest.advanceTimersByTime(1000);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith('Report data:', reportResult);
      expect(reportResult.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should log report result with all properties', async () => {
      const recipients = ['user@example.com'];
      const reportName = 'Full Report';
      const reportResult: ReportResult = {
        content: 'Complete report content',
        mimeType: 'text/html',
        fileName: 'full-report.html',
      };

      const sendPromise = service.sendReportEmail(recipients, reportName, reportResult);
      
      jest.advanceTimersByTime(1000);
      
      await sendPromise;

      expect(consoleLogSpy).toHaveBeenCalledWith('Report data:', expect.objectContaining({
        content: 'Complete report content',
        mimeType: 'text/html',
        fileName: 'full-report.html',
      }));
    });
  });
});
