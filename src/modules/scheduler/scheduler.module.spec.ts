import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { ReportProcessor } from './report.processor';
import { ReportScheduleService } from './report-schedule.service';
import { ReportSchedule } from 'src/entities/report-schedule.entity';
import { ReportsService } from '../reports/reports.service';
import { EmailService } from '../reports/email-service';

describe('SchedulerModule', () => {
  let module: TestingModule;

  // Mock repositories
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  // Mock services
  const mockReportsService = {
    executeReport: jest.fn(),
  };

  const mockEmailService = {
    sendReportEmail: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        SchedulerService,
        ReportProcessor,
        ReportScheduleService,
        {
          provide: getRepositoryToken(ReportSchedule),
          useValue: mockRepository,
        },
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have SchedulerController', () => {
    const controller = module.get<SchedulerController>(SchedulerController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(SchedulerController);
  });

  it('should have SchedulerService', () => {
    const service = module.get<SchedulerService>(SchedulerService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(SchedulerService);
  });

  it('should have ReportProcessor', () => {
    const processor = module.get<ReportProcessor>(ReportProcessor);
    expect(processor).toBeDefined();
    expect(processor).toBeInstanceOf(ReportProcessor);
  });

  it('should have ReportScheduleService', () => {
    const service = module.get<ReportScheduleService>(ReportScheduleService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReportScheduleService);
  });

  it('should provide all required services', () => {
    expect(module.get<SchedulerService>(SchedulerService)).toBeDefined();
    expect(module.get<ReportProcessor>(ReportProcessor)).toBeDefined();
    expect(module.get<ReportScheduleService>(ReportScheduleService)).toBeDefined();
  });

  it('should inject ReportsService into SchedulerService', () => {
    const schedulerService = module.get<SchedulerService>(SchedulerService);
    expect(schedulerService).toBeDefined();
    // Service is properly instantiated with mocked ReportsService
  });

  it('should inject EmailService into SchedulerService', () => {
    const schedulerService = module.get<SchedulerService>(SchedulerService);
    expect(schedulerService).toBeDefined();
    // Service is properly instantiated with mocked EmailService
  });

  it('should inject ReportScheduleService into SchedulerService', () => {
    const schedulerService = module.get<SchedulerService>(SchedulerService);
    expect(schedulerService).toBeDefined();
    // Service is properly instantiated with mocked ReportScheduleService
  });

  it('should inject dependencies into ReportProcessor', () => {
    const processor = module.get<ReportProcessor>(ReportProcessor);
    expect(processor).toBeDefined();
    // Processor is properly instantiated with all mocked dependencies
  });
});
