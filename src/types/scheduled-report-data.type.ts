/**
 * Represents data for a scheduled report execution.
 * 
 * This interface contains all information related to a scheduled report,
 * including the report configuration, execution parameters, generated data,
 * and metadata about when it was created and updated.
 * 
 * @interface ScheduledReportData
 * 
 * @property {string} reportId - The UUID of the report that was executed
 * @property {string} userId - The UUID of the user who owns this scheduled report
 * @property {string} scheduleId - The UUID of the schedule configuration used
 * @property {any} data - The actual generated report data (ReportResult object with content, mimeType, fileName)
 * @property {Record<string, any>} parameters - Parameters that were used when executing the report
 * @property {Date} createdAt - Timestamp when the scheduled report data was created
 * @property {Date} updatedAt - Timestamp when the scheduled report data was last updated
 * 
 * @example
 * const scheduledData: ScheduledReportData = {
 *   reportId: '123e4567-e89b-12d3-a456-426614174000',
 *   userId: 'user-123',
 *   scheduleId: 'schedule-456',
 *   data: {
 *     content: pdfBuffer,
 *     mimeType: 'application/pdf',
 *     fileName: 'monthly-report-2024-01.pdf'
 *   },
 *   parameters: {
 *     startDate: '2024-01-01',
 *     endDate: '2024-01-31'
 *   },
 *   createdAt: new Date('2024-01-15T00:00:00Z'),
 *   updatedAt: new Date('2024-01-15T00:00:00Z')
 * };
 */
export interface ScheduledReportData {
  /** The UUID of the report that was executed */
  reportId: string;
  /** The UUID of the user who owns this scheduled report */
  userId: string;
  /** The UUID of the schedule configuration used */
  scheduleId: string;
  /** The actual generated report data (ReportResult object with content, mimeType, fileName) */
  data: any;
  /** Parameters that were used when executing the report */
  parameters: Record<string, any>;
  /** Timestamp when the scheduled report data was created */
  createdAt: Date;
  /** Timestamp when the scheduled report data was last updated */
  updatedAt: Date;
}