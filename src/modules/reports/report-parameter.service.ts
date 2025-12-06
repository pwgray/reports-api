import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportParameter } from 'src/entities/report-parameter.entity';

/**
 * Service for managing report parameters.
 * 
 * This service provides functionality to:
 * - Retrieve parameters associated with reports
 * - Manage report parameter configurations
 * - Support parameterized reports that accept user input
 * 
 * Report parameters allow reports to be dynamic, accepting values at runtime
 * that can be used in filters, calculations, or other report logic. Parameters
 * can have types (string, number, date, etc.), default values, validation rules,
 * and can be marked as required or optional.
 * 
 * @class ReportParameterService
 */
@Injectable()
export class ReportParameterService {
  /**
   * Creates an instance of ReportParameterService.
   * 
   * @param {Repository<ReportParameter>} reportParameterRepository - TypeORM repository for ReportParameter entities
   */
  constructor(
    @InjectRepository(ReportParameter)
    private readonly reportParameterRepository: Repository<ReportParameter>
  ) {}

  /**
   * Finds all parameters associated with a specific report.
   * 
   * Retrieves all report parameters that belong to the specified report,
   * which can be used to build parameterized queries or display parameter
   * input forms to users.
   * 
   * @param {string} reportId - The UUID of the report to find parameters for
   * @returns {Promise<ReportParameter[]>} Array of report parameters associated with the report
   * 
   * @example
   * const parameters = await reportParameterService.findByReportId('123e4567-e89b-12d3-a456-426614174000');
   * // Returns: [
   * //   {
   * //     id: 'param-1',
   * //     name: 'startDate',
   * //     displayName: 'Start Date',
   * //     type: ParameterType.DATE,
   * //     required: true,
   * //     defaultValue: null,
   * //     validationRules: [...]
   * //   },
   * //   ...
   * // ]
   * 
   * @remarks
   * - Returns empty array if no parameters are found for the report
   * - Parameters are typically used to build dynamic WHERE clauses in queries
   * - Can be used to generate parameter input forms in the UI
   */
  async findByReportId(reportId: string): Promise<ReportParameter[]> {
    return this.reportParameterRepository.find({
      where: { report: { id: reportId } },
    });
  }

  // Add other methods as needed
  // Potential future methods:
  // - create(reportId: string, parameter: Partial<ReportParameter>): Promise<ReportParameter>
  // - update(id: string, parameter: Partial<ReportParameter>): Promise<ReportParameter>
  // - delete(id: string): Promise<void>
  // - validateParameterValue(parameter: ReportParameter, value: any): boolean
}
