export interface LayoutConfiguration {
    // Unique identifier for the layout
    id: string;

    // Name of the layout
    name: string;

    // Description of the layout
    description?: string;

    // Type of layout (e.g., 'table', 'chart', 'dashboard')
    type: string;

    // Configuration for the layout, can vary based on type
    configuration: any;

    // List of fields to display in the layout
    columns: FieldConfiguration[];

    // Optional filters to apply to the layout
    filters?: string[];

    // Sorting configuration for the layout
    sort?: {
        field: string;
        order: 'asc' | 'desc';
    }[];
    // Pagination configuration
    pagination?: {
        pageSize: number;
        currentPage: number;
    };
    // Associated report ID
    reportId: string;
    // Creation date of the layout
    createdAt?: Date;
    // Last updated date of the layout
    updatedAt?: Date;
    // Indicates if the layout is active
    isActive?: boolean;
    // Indicates if the layout is archived
    isArchived?: boolean;
    // Indicates if the layout is public
    isPublic?: boolean;
    // Metadata for additional information
    metadata?: Record<string, any>;
}

export interface FieldConfiguration {
    // Unique identifier for this field in the layout
    id: string;
    // Name of the field to display
    fieldName: string;
    // Display name for the field
    displayName: string;
    // Data type of the field (e.g., 'string', 'number', 'date')
    dataType: string;
}