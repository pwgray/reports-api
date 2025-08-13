export interface ScheduledReportData {
  reportId: string;
  userId: string;
  scheduleId: string;
  data: any; // The actual report data, can be of any type
  parameters: Record<string, any>; // Parameters for the report execution
  createdAt: Date;
  updatedAt: Date;
}