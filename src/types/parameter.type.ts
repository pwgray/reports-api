/**
 * Enumeration of parameter data types for report parameters.
 * 
 * Defines the supported data types that can be used for report parameters,
 * which are input values provided by users when executing parameterized reports.
 * 
 * @enum {ParameterType}
 * 
 * @property {string} STRING - Text/string parameter type
 * @property {string} NUMBER - Numeric parameter type (floating point)
 * @property {string} DATE - Date parameter type
 * @property {string} BOOLEAN - Boolean/true-false parameter type
 * @property {string} LIST - List/array parameter type for multiple values
 * 
 * @example
 * const paramType = ParameterType.DATE;
 * // Used when defining report parameters that accept date inputs
 */
export enum ParameterType {
  /** Text/string parameter type */
  STRING = 'string',
  /** Numeric parameter type (floating point) */
  NUMBER = 'number',
  /** Date parameter type */
  DATE = 'date',
  /** Boolean/true-false parameter type */
  BOOLEAN = 'boolean',
  /** List/array parameter type for multiple values */
  LIST = 'list'
}