export class FilterConfigurationDto {
    field: string;
    operator: string; // e.g., '=', '!=', '>', '<', 'LIKE', etc.
    value: any; // The value to filter by, can be of any type
}