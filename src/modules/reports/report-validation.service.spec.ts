import { BadRequestException } from '@nestjs/common';
import { ReportValidationService } from './report-validation.service';
import { Report } from 'src/entities/report.entity';
import { ReportParameter } from 'src/entities/report-parameter.entity';

describe('ReportValidationService', () => {
  let service: ReportValidationService;

  beforeEach(() => {
    service = new ReportValidationService();
  });

  describe('validateReportParameters', () => {
    it('should validate successfully with all required parameters provided', () => {
      const report = {
        id: '1',
        parameters: [
          { name: 'startDate', required: true } as ReportParameter,
          { name: 'endDate', required: true } as ReportParameter,
        ],
      } as Report;

      const parameters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when report is null', () => {
      expect(() => {
        service.validateReportParameters(null as any, {});
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReportParameters(null as any, {});
      }).toThrow('Invalid report or parameters');
    });

    it('should throw error when report.parameters is null', () => {
      const report = { id: '1', parameters: null } as any;

      expect(() => {
        service.validateReportParameters(report, {});
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReportParameters(report, {});
      }).toThrow('Invalid report or parameters');
    });

    it('should throw error when required parameter is missing', () => {
      const report = {
        id: '1',
        parameters: [
          { name: 'requiredParam', required: true } as ReportParameter,
        ],
      } as Report;

      const parameters = {};

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Missing required parameter: requiredParam');
    });

    it('should throw error when required parameter is null', () => {
      const report = {
        id: '1',
        parameters: [
          { name: 'requiredParam', required: true } as ReportParameter,
        ],
      } as Report;

      const parameters = { requiredParam: null };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Missing required parameter: requiredParam');
    });

    it('should throw error when required parameter is undefined', () => {
      const report = {
        id: '1',
        parameters: [
          { name: 'requiredParam', required: true } as ReportParameter,
        ],
      } as Report;

      const parameters = { requiredParam: undefined };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Missing required parameter: requiredParam');
    });

    it('should allow optional parameters to be missing', () => {
      const report = {
        id: '1',
        parameters: [
          { name: 'optionalParam', required: false } as ReportParameter,
        ],
      } as Report;

      const parameters = {};

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should validate regex pattern successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'email',
            required: true,
            validationRules: [
              { type: 'regex', pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$', message: 'Invalid email format' },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { email: 'test@example.com' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when regex validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'email',
            required: true,
            validationRules: [
              { type: 'regex', pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$', message: 'Invalid email format' },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { email: 'invalid-email' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow(BadRequestException);
      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter email does not match validation rule: Invalid email format');
    });

    it('should validate minLength successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'username',
            required: true,
            validationRules: [
              { type: 'minLength', value: 5 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { username: 'johndoe' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when minLength validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'username',
            required: true,
            validationRules: [
              { type: 'minLength', value: 5 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { username: 'abc' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter username must be at least 5 characters long');
    });

    it('should validate maxLength successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'description',
            required: true,
            validationRules: [
              { type: 'maxLength', value: 100 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { description: 'Short description' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when maxLength validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'description',
            required: true,
            validationRules: [
              { type: 'maxLength', value: 10 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { description: 'This is a very long description that exceeds the limit' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter description must be at most 10 characters long');
    });

    it('should validate minValue successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'age',
            required: true,
            validationRules: [
              { type: 'minValue', value: 18 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { age: 25 };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when minValue validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'age',
            required: true,
            validationRules: [
              { type: 'minValue', value: 18 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { age: 15 };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter age must be at least 18');
    });

    it('should validate maxValue successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'quantity',
            required: true,
            validationRules: [
              { type: 'maxValue', value: 100 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { quantity: 50 };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when maxValue validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'quantity',
            required: true,
            validationRules: [
              { type: 'maxValue', value: 100 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { quantity: 150 };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter quantity must be at most 100');
    });

    it('should validate enum successfully', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'status',
            required: true,
            validationRules: [
              { type: 'enum', values: ['active', 'inactive', 'pending'] },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { status: 'active' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should throw error when enum validation fails', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'status',
            required: true,
            validationRules: [
              { type: 'enum', values: ['active', 'inactive', 'pending'] },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { status: 'deleted' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Parameter status must be one of: active, inactive, pending');
    });

    it('should throw error for unknown validation rule type', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'field',
            required: true,
            validationRules: [
              { type: 'unknownType' as any, value: 'test' },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { field: 'value' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).toThrow('Unknown validation rule type: unknownType');
    });

    it('should validate multiple rules for a single parameter', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'password',
            required: true,
            validationRules: [
              { type: 'minLength', value: 8 },
              { type: 'maxLength', value: 20 },
              { type: 'regex', pattern: '.*[A-Z].*', message: 'Must contain uppercase' },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { password: 'ValidPass123' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should validate multiple parameters with different rules', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'email',
            required: true,
            validationRules: [
              { type: 'regex', pattern: '^[^@]+@[^@]+\\.[^@]+$', message: 'Invalid email' },
            ],
          } as ReportParameter,
          {
            name: 'age',
            required: true,
            validationRules: [
              { type: 'minValue', value: 0 },
              { type: 'maxValue', value: 120 },
            ],
          } as ReportParameter,
          {
            name: 'role',
            required: false,
            validationRules: [
              { type: 'enum', values: ['admin', 'user', 'guest'] },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = {
        email: 'test@example.com',
        age: 30,
        role: 'user',
      };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should skip validation for null/undefined values on optional parameters', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'optionalField',
            required: false,
            validationRules: [
              { type: 'minLength', value: 10 },
            ],
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { optionalField: null };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });

    it('should handle parameters with no validation rules', () => {
      const report = {
        id: '1',
        parameters: [
          {
            name: 'simpleParam',
            required: true,
            validationRules: undefined,
          } as ReportParameter,
        ],
      } as Report;

      const parameters = { simpleParam: 'any value' };

      expect(() => {
        service.validateReportParameters(report, parameters);
      }).not.toThrow();
    });
  });
});
