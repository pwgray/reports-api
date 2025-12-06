/**
 * Configuration for report layout and presentation.
 * 
 * Defines how a report should be displayed, including which fields to show,
 * their order, formatting, sorting, pagination, and other presentation options.
 * 
 * @interface LayoutConfiguration
 * 
 * @property {string} id - Unique identifier for the layout
 * @property {string} name - Name of the layout
 * @property {string} [description] - Description of the layout
 * @property {string} type - Type of layout (e.g., 'table', 'chart', 'dashboard')
 * @property {any} configuration - Configuration object that can vary based on layout type
 * @property {FieldConfiguration[]} columns - List of fields to display in the layout
 * @property {string[]} [filters] - Optional filters to apply to the layout
 * @property {{field: string; order: 'asc' | 'desc'}[]} [sort] - Sorting configuration for the layout
 * @property {{pageSize: number; currentPage: number}} [pagination] - Pagination configuration
 * @property {string} reportId - Associated report ID
 * @property {Date} [createdAt] - Creation date of the layout
 * @property {Date} [updatedAt] - Last updated date of the layout
 * @property {boolean} [isActive] - Indicates if the layout is active
 * @property {boolean} [isArchived] - Indicates if the layout is archived
 * @property {boolean} [isPublic] - Indicates if the layout is public
 * @property {Record<string, any>} [metadata] - Metadata for additional information
 * 
 * @example
 * const layout: LayoutConfiguration = {
 *   id: 'layout-123',
 *   name: 'Sales Report Table',
 *   description: 'Monthly sales data in table format',
 *   type: 'table',
 *   configuration: { showHeader: true, stripedRows: true },
 *   columns: [
 *     { id: 'col-1', fieldName: 'customerName', displayName: 'Customer', dataType: 'string' },
 *     { id: 'col-2', fieldName: 'totalSales', displayName: 'Total Sales', dataType: 'number' }
 *   ],
 *   sort: [{ field: 'totalSales', order: 'desc' }],
 *   pagination: { pageSize: 50, currentPage: 1 },
 *   reportId: 'report-456',
 *   isActive: true
 * };
 */
export interface LayoutConfiguration {
    /** Unique identifier for the layout */
    id: string;
    /** Name of the layout */
    name: string;
    /** Description of the layout */
    description?: string;
    /** Type of layout (e.g., 'table', 'chart', 'dashboard') */
    type: string;
    /** Configuration object that can vary based on layout type */
    configuration: any;
    /** List of fields to display in the layout */
    columns: FieldConfiguration[];
    /** Optional filters to apply to the layout */
    filters?: string[];
    /** Sorting configuration for the layout */
    sort?: {
        field: string;
        order: 'asc' | 'desc';
    }[];
    /** Pagination configuration */
    pagination?: {
        pageSize: number;
        currentPage: number;
    };
    /** Associated report ID */
    reportId: string;
    /** Creation date of the layout */
    createdAt?: Date;
    /** Last updated date of the layout */
    updatedAt?: Date;
    /** Indicates if the layout is active */
    isActive?: boolean;
    /** Indicates if the layout is archived */
    isArchived?: boolean;
    /** Indicates if the layout is public */
    isPublic?: boolean;
    /** Metadata for additional information */
    metadata?: Record<string, any>;
}

/**
 * Configuration for a single field in a layout.
 * 
 * Defines how a specific field should be displayed in the report layout,
 * including its identifier, database field name, display name, and data type.
 * 
 * @interface FieldConfiguration
 * 
 * @property {string} id - Unique identifier for this field in the layout
 * @property {string} fieldName - Name of the field to display (database field name)
 * @property {string} displayName - Display name for the field (user-friendly label)
 * @property {string} dataType - Data type of the field (e.g., 'string', 'number', 'date')
 * 
 * @example
 * const field: FieldConfiguration = {
 *   id: 'field-customer-name',
 *   fieldName: 'customer_name',
 *   displayName: 'Customer Name',
 *   dataType: 'string'
 * };
 */
export interface FieldConfiguration {
    /** Unique identifier for this field in the layout */
    id: string;
    /** Name of the field to display (database field name) */
    fieldName: string;
    /** Display name for the field (user-friendly label) */
    displayName: string;
    /** Data type of the field (e.g., 'string', 'number', 'date') */
    dataType: string;
}