import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource as TypeORMDataSource, Repository } from 'typeorm';
import { DataSource } from '../../entities/data-source.entity';
import { DatabaseSchema, DatabaseType } from 'src/types/database-schema.type';

/**
 * Service for managing data sources and database connections.
 * 
 * This service provides functionality to:
 * - Manage data source CRUD operations
 * - Establish and cache database connections for reuse
 * - Introspect database schemas (tables, views, procedures, relationships)
 * - Apply filtering options during schema introspection
 * 
 * The service implements connection pooling by caching database connections
 * based on connection parameters, allowing efficient reuse across multiple
 * introspection requests.
 * 
 * @class DataSourceService
 * @implements {OnModuleDestroy}
 */
@Injectable()
export class DataSourceService implements OnModuleDestroy {
  /**
   * Cache of active database connections keyed by connection string.
   * Connections are reused across multiple introspection requests to improve performance.
   * 
   * @private
   * @type {Map<string, TypeORMDataSource>}
   */
  private connectionCache = new Map<string, TypeORMDataSource>();

  /**
   * Creates an instance of DataSourceService.
   * 
   * @param {Repository<DataSource>} dataSourceRepository - TypeORM repository for DataSource entities
   */
  constructor(
    @InjectRepository(DataSource)
    private readonly dataSourceRepository: Repository<DataSource>
  ) { }

  /**
   * Generates a unique cache key for a database connection.
   * 
   * The key is based on connection parameters to ensure connections with
   * the same parameters are reused from the cache.
   * 
   * @private
   * @param {string} server - Database server hostname or IP address
   * @param {number | undefined} port - Database server port (uses 'default' if not provided)
   * @param {string} database - Database name
   * @param {string} username - Database username
   * @param {string} type - Database type (e.g., 'sqlserver', 'mysql', 'postgresql')
   * @returns {string} A unique connection key in format: `{type}://{username}@{server}:{port}/{database}`
   * 
   * @example
   * generateConnectionKey('localhost', 1433, 'Northwind', 'sa', 'sqlserver')
   * // Returns: 'sqlserver://sa@localhost:1433/Northwind'
   */
  private generateConnectionKey(
    server: string,
    port: number | undefined,
    database: string,
    username: string,
    type: string
  ): string {
    return `${type}://${username}@${server}:${port || 'default'}/${database}`;
  }

  /**
   * Gets an existing cached database connection or creates a new one.
   * 
   * This method implements connection pooling by checking if a connection
   * with the same parameters already exists in the cache. If found and
   * still initialized, it reuses the connection. Otherwise, it creates
   * a new connection and caches it for future use.
   * 
   * @private
   * @param {string} server - Database server hostname or IP address
   * @param {number | undefined} port - Database server port
   * @param {string} database - Database name
   * @param {string} username - Database username
   * @param {string} password - Database password
   * @param {string} type - Database type (e.g., 'sqlserver', 'mysql', 'postgresql')
   * @returns {Promise<TypeORMDataSource>} A TypeORM DataSource instance
   * @throws {Error} If connection initialization fails
   * 
   * @remarks
   * - For SQL Server, automatically configures trustServerCertificate, encrypt, and enableArithAbort
   * - Supports Windows domain authentication via DB_DOMAIN environment variable
   * - Stale connections are automatically removed from cache
   */
  private async getOrCreateConnection(
    server: string,
    port: number | undefined,
    database: string,
    username: string,
    password: string,
    type: string
  ): Promise<TypeORMDataSource> {
    const connectionKey = this.generateConnectionKey(server, port, database, username, type);

    // Check if connection exists and is still connected
    if (this.connectionCache.has(connectionKey)) {
      const existingConnection = this.connectionCache.get(connectionKey);
      if (existingConnection && existingConnection.isInitialized) {
        console.log('♻️  Reusing existing database connection:', connectionKey);
        return existingConnection;
      } else {
        // Remove stale connection from cache
        this.connectionCache.delete(connectionKey);
      }
    }

    // Create new connection
    console.log('🔌 Creating new database connection:', connectionKey);
    const driverType = this.mapDatabaseTypeToDriver(type);

    const connectionOptions: any = {
      type: driverType,
      host: server,
      database: database,
      username: username,
      password: password,
      ...(process.env.DB_DOMAIN && process.env.DB_DOMAIN.trim() !== '' && { domain: process.env.DB_DOMAIN }),
    };

    // Add port if provided
    if (port) {
      connectionOptions.port = port;
    }

    // Add database-specific options
    if (driverType === 'mssql') {
      connectionOptions.options = {
        trustServerCertificate: true,
        encrypt: true,
        enableArithAbort: true,
      };
    }

    const dataSource = new TypeORMDataSource(connectionOptions);
    await dataSource.initialize();

    // Cache the connection for reuse
    this.connectionCache.set(connectionKey, dataSource);

    return dataSource;
  }

  /**
   * Cleanup method to close all cached database connections when the module is destroyed.
   * 
   * This method is called automatically by NestJS when the application shuts down.
   * It ensures all database connections are properly closed to prevent resource leaks.
   * 
   * @returns {Promise<void>}
   * 
   * @remarks
   * - Closes all connections in parallel for efficiency
   * - Handles errors gracefully, logging but not throwing
   * - Clears the connection cache after closing all connections
   */
  async onModuleDestroy() {
    console.log('🧹 Cleaning up database connections...');
    const closePromises = Array.from(this.connectionCache.values()).map(async (connection) => {
      if (connection.isInitialized) {
        try {
          await connection.destroy();
        } catch (error) {
          console.error('Error closing connection:', error);
        }
      }
    });
    await Promise.all(closePromises);
    this.connectionCache.clear();
    console.log('✅ All connections closed');
  }

  /**
   * Finds a data source by its unique identifier.
   * 
   * @param {string} id - The UUID of the data source to find
   * @returns {Promise<DataSource>} The found data source entity
   * @throws {NotFoundException} If no data source is found with the given ID
   * 
   * @example
   * const dataSource = await dataSourceService.findById('123e4567-e89b-12d3-a456-426614174000');
   */
  async findById(id: string): Promise<DataSource> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id }
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    return dataSource;
  }

  /**
   * Creates a new data source configuration.
   * 
   * @param {Partial<DataSource>} dataSource - Partial data source object with properties to set
   * @returns {Promise<DataSource>} The created data source entity with generated ID and timestamps
   * 
   * @example
   * const newDataSource = await dataSourceService.create({
   *   name: 'Production Database',
   *   type: DatabaseType.SQLSERVER,
   *   server: 'localhost',
   *   database: 'Northwind'
   * });
   */
  async create(dataSource: Partial<DataSource>): Promise<DataSource> {
    const newDataSource = this.dataSourceRepository.create(dataSource);
    return await this.dataSourceRepository.save(newDataSource);
  }

  /**
   * Updates an existing data source configuration.
   * 
   * @param {string} id - The UUID of the data source to update
   * @param {Partial<DataSource>} dataSource - Partial data source object with properties to update
   * @returns {Promise<DataSource>} The updated data source entity
   * @throws {NotFoundException} If no data source is found with the given ID
   * 
   * @example
   * const updated = await dataSourceService.update('123e4567-e89b-12d3-a456-426614174000', {
   *   name: 'Updated Database Name',
   *   port: 1434
   * });
   */
  async update(id: string, dataSource: Partial<DataSource>): Promise<DataSource> {
    await this.dataSourceRepository.update(id, dataSource);
    return this.findById(id);
  }

  /**
   * Deletes a data source by its unique identifier.
   * 
   * @param {string} id - The UUID of the data source to delete
   * @returns {Promise<void>}
   * @throws {NotFoundException} If no data source is found with the given ID
   * 
   * @example
   * await dataSourceService.delete('123e4567-e89b-12d3-a456-426614174000');
   */
  async delete(id: string): Promise<void> {
    const result = await this.dataSourceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }
  }

  /**
   * Retrieves all data sources from the database.
   * 
   * @returns {Promise<DataSource[]>} An array of all data source entities
   * 
   * @example
   * const allDataSources = await dataSourceService.findAll();
   * console.log(`Found ${allDataSources.length} data sources`);
   */
  async findAll(): Promise<DataSource[]> {
    return this.dataSourceRepository.find();
  }

  /**
   * Introspects a database schema and returns detailed metadata.
   * 
   * This method connects to a database and retrieves comprehensive schema information
   * including tables, views, stored procedures, columns, indexes, constraints, and
   * relationships. The introspection supports filtering by schema, object type, and
   * object name patterns.
   * 
   * @param {string} server - Database server hostname or IP address
   * @param {number | undefined} port - Database server port
   * @param {string} database - Database name to introspect
   * @param {string} username - Database username for authentication
   * @param {string} password - Database password for authentication
   * @param {string} type - Database type (e.g., 'sqlserver', 'mysql', 'postgresql')
   * @param {string[]} [includedSchemas] - Optional array of schema names to include (e.g., ['dbo', 'custom'])
   * @param {string[]} [includedObjectTypes] - Optional array of object types to include (e.g., ['table', 'view', 'procedure'])
   * @param {string} [objectNamePattern] - Optional SQL LIKE pattern for filtering objects by name (e.g., 'Customer%')
   * @returns {Promise<DatabaseSchema>} A DatabaseSchema object containing tables, views, procedures, relationships, and statistics
   * @throws {Error} If connection fails or database query execution fails
   * 
   * @remarks
   * - Currently optimized for SQL Server databases
   * - Uses cached connections when possible for better performance
   * - Returns normalized data types for better cross-database compatibility
   * - Includes row counts, indexes, foreign keys, and relationship mappings
   * - Failed connections are automatically removed from cache
   * 
   * @example
   * const schema = await dataSourceService.introspect(
   *   'localhost',
   *   1433,
   *   'Northwind',
   *   'sa',
   *   'password',
   *   'sqlserver',
   *   ['dbo', 'sales'],  // Only include these schemas
   *   ['table', 'view'], // Only include tables and views
   *   'Customer%'        // Only objects starting with 'Customer'
   * );
   */
  async introspect(
    server: string, 
    port: number | undefined, 
    database: string, 
    username: string, 
    password: string, 
    type: string,    
    includedSchemas?: string[],
    includedObjectTypes?: string[],
    objectNamePattern?: string
  ): Promise<DatabaseSchema> {

    let connection: TypeORMDataSource | null = null;

    try {
      console.log('🔍 Introspecting with filters:', { 
        includedSchemas, 
        includedObjectTypes, 
        objectNamePattern 
      });

      // Get or create a reusable connection
      connection = await this.getOrCreateConnection(
        server,
        port,
        database,
        username,
        password,
        type
      );

      // Build filter clauses for SQL
      let tableFilter = 't.is_ms_shipped = 0';
      let viewFilter = '1=1';
      let procFilter = 'o.type IN (\'P\',\'FN\',\'IF\',\'TF\')';

      // Schema filtering
      if (includedSchemas && includedSchemas.length > 0) {
        const schemaList = includedSchemas.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
        tableFilter += ` AND s.name IN (${schemaList})`;
        viewFilter += ` AND s.name IN (${schemaList})`;
        procFilter += ` AND s.name IN (${schemaList})`;
      }

      // Object name pattern filtering
      if (objectNamePattern && objectNamePattern.trim()) {
        const pattern = objectNamePattern.trim().replace(/'/g, "''");
        tableFilter += ` AND t.name LIKE '${pattern}'`;
        viewFilter += ` AND v.name LIKE '${pattern}'`;
        procFilter += ` AND o.name LIKE '${pattern}'`;
      }

      // Object type filtering
      const includeTableTypes = !includedObjectTypes || includedObjectTypes.length === 0 || 
                               includedObjectTypes.includes('table') || 
                               includedObjectTypes.includes('base_table');
      const includeViews = !includedObjectTypes || includedObjectTypes.length === 0 || 
                          includedObjectTypes.includes('view');
      const includeProcedures = !includedObjectTypes || includedObjectTypes.length === 0 || 
                               includedObjectTypes.includes('procedure') || 
                               includedObjectTypes.includes('stored_procedure');

      console.log('📊 Include types:', { includeTableTypes, includeViews, includeProcedures });


      // Build the main query conditionally
      const viewsQuery = includeViews ? `
          views = JSON_QUERY((
              SELECT
                  name = v.name,
                  [schema] = s.name,
                  displayName = NULL,
                  description = NULL,
                  definition = sm.definition,
                  isUpdatable = CAST(OBJECTPROPERTY(v.object_id, 'IsUpdateable') AS bit),
                  columns = JSON_QUERY((
                      SELECT
                          name = c.name,
                          dataType = ty.name,
                          normalizedType = ISNULL(tm.normalizedType,'string'),
                          isNullable = CAST(c.is_nullable AS bit),
                          ordinalPosition = c.column_id
                      FROM sys.columns c WITH (NOLOCK)
                      JOIN sys.types ty WITH (NOLOCK) ON ty.user_type_id = c.user_type_id
                      LEFT JOIN TypeMap tm ON tm.type_name = ty.name
                      WHERE c.object_id = v.object_id
                      ORDER BY c.column_id
                      FOR JSON PATH
                  ))
              FROM sys.views v WITH (NOLOCK)
              JOIN sys.schemas s WITH (NOLOCK) ON s.schema_id = v.schema_id
              LEFT JOIN sys.sql_modules sm WITH (NOLOCK) ON sm.object_id = v.object_id
              WHERE ${viewFilter}
              ORDER BY s.name, v.name
              FOR JSON PATH
          )),` : 'views = NULL,';

      const proceduresQuery = includeProcedures ? `
          procedures = JSON_QUERY((
              SELECT
                  name = o.name,
                  [schema] = s.name,
                  displayName = NULL,
                  description = NULL,
                  type = CASE
                      WHEN o.type IN ('P') THEN 'stored_procedure'
                      WHEN o.type IN ('FN','IF','TF') THEN 'function'
                      ELSE 'stored_procedure'
                  END,
                  parameters = JSON_QUERY((
                      SELECT
                          name = prm.name,
                          dataType = ty.name,
                          normalizedType = ISNULL(tm.normalizedType,'string'),
                          isOutput = CAST(prm.is_output AS bit),
                          isOptional = CAST(prm.has_default_value AS bit),
                          defaultValue = NULL,
                          description = NULL
                      FROM sys.parameters prm WITH (NOLOCK)
                      JOIN sys.types ty WITH (NOLOCK) ON ty.user_type_id = prm.user_type_id
                      LEFT JOIN TypeMap tm ON tm.type_name = ty.name
                      WHERE prm.object_id = o.object_id
                      ORDER BY prm.parameter_id
                      FOR JSON PATH
                  ))
              FROM sys.objects o WITH (NOLOCK)
              JOIN sys.schemas s WITH (NOLOCK) ON s.schema_id = o.schema_id
              WHERE ${procFilter}
              ORDER BY s.name, o.name
              FOR JSON PATH
          )),` : 'procedures = NULL,';

      let rows = await connection.query(`
        SET NOCOUNT ON;
    
        DECLARE @startedAt datetime2 = SYSUTCDATETIME();

      -- Precompute common metadata
      ;WITH RowCounts AS (
          SELECT object_id, rows = SUM(CASE WHEN index_id IN (0,1) THEN rows ELSE 0 END)
          FROM sys.partitions WITH (NOLOCK)
          GROUP BY object_id
      ),
      PrimaryKeys AS (
          SELECT ic.object_id, ic.column_id
          FROM sys.index_columns ic WITH (NOLOCK)
          JOIN sys.indexes i WITH (NOLOCK)
            ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          WHERE i.is_primary_key = 1
      ),
      UniqueKeys AS (
          SELECT ic.object_id, ic.column_id
          FROM sys.index_columns ic WITH (NOLOCK)
          JOIN sys.indexes i WITH (NOLOCK)
            ON i.object_id = ic.object_id AND i.index_id = ic.index_id
          WHERE i.is_unique = 1
      ),
      ForeignKeys AS (
          SELECT fkc.parent_object_id AS object_id,
                fkc.parent_column_id AS column_id,
                fk.name AS constraintName,
                rt.name AS referencedTable,
                rc.name AS referencedColumn,
                LOWER(fk.delete_referential_action_desc) AS onDeleteAction,
                LOWER(fk.update_referential_action_desc) AS onUpdateAction
          FROM sys.foreign_key_columns fkc WITH (NOLOCK)
          JOIN sys.foreign_keys fk WITH (NOLOCK)
            ON fk.object_id = fkc.constraint_object_id
          JOIN sys.tables rt WITH (NOLOCK)
            ON rt.object_id = fkc.referenced_object_id
          JOIN sys.columns rc WITH (NOLOCK)
            ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
      ),
      TypeMap AS (
          SELECT type_name, normalizedType
          FROM (VALUES
              ('varchar','string'),('nvarchar','string'),('char','string'),('nchar','string'),('sysname','string'),
              ('text','string'),('ntext','string'),
              ('int','integer'),('bigint','integer'),('smallint','integer'),('tinyint','integer'),
              ('decimal','decimal'),('numeric','decimal'),
              ('money','currency'),('smallmoney','currency'),
              ('float','number'),('real','number'),
              ('bit','boolean'),
              ('date','date'),
              ('datetime','datetime'),('datetime2','datetime'),('smalldatetime','datetime'),('datetimeoffset','datetime'),
              ('time','time'),
              ('uniqueidentifier','uuid'),
              ('varbinary','binary'),('binary','binary'),('image','binary'),
              ('rowversion','binary'),('timestamp','binary')
          ) AS v(type_name, normalizedType)
      ),
      TableStats AS (
          SELECT
              totalTables = SUM(CASE WHEN t.is_ms_shipped = 0 THEN 1 ELSE 0 END),
              totalViews = (SELECT COUNT(*) FROM sys.views WITH (NOLOCK)),
              totalProcedures = (SELECT COUNT(*) FROM sys.procedures WITH (NOLOCK)),
              totalIndexes = (
                  SELECT COUNT(*) 
                  FROM sys.indexes i WITH (NOLOCK)
                  JOIN sys.tables t WITH (NOLOCK) ON t.object_id = i.object_id
                  WHERE t.is_ms_shipped = 0 AND i.index_id > 0 AND i.is_hypothetical = 0
              ),
              totalSizeInBytes = (SELECT SUM(size) * 8192 FROM sys.database_files WITH (NOLOCK)),
              totalRows = (SELECT SUM(rows) FROM sys.partitions WITH (NOLOCK) WHERE index_id IN (0,1)),
              tablesWithPrimaryKeys = SUM(CASE WHEN pk.object_id IS NOT NULL THEN 1 ELSE 0 END),
              tablesWithForeignKeys = SUM(CASE WHEN fk.parent_object_id IS NOT NULL THEN 1 ELSE 0 END),
              orphanedTables = SUM(CASE WHEN fk.parent_object_id IS NULL AND rfk.referenced_object_id IS NULL THEN 1 ELSE 0 END),
              mostAccessedTables = NULL
          FROM sys.tables t WITH (NOLOCK)
          LEFT JOIN sys.indexes pk WITH (NOLOCK)
              ON pk.object_id = t.object_id AND pk.is_primary_key = 1
          LEFT JOIN sys.foreign_keys fk WITH (NOLOCK)
              ON fk.parent_object_id = t.object_id
          LEFT JOIN sys.foreign_keys rfk WITH (NOLOCK)
              ON rfk.referenced_object_id = t.object_id
          WHERE t.is_ms_shipped = 0
      )

      SELECT [json] =(
        SELECT
          databaseName = DB_NAME(),
          databaseType = 'sqlserver',
          version = CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)),
          lastScanned = @startedAt,
          scanDuration = DATEDIFF(ms, @startedAt, SYSUTCDATETIME()),

          tables = JSON_QUERY((
              SELECT
                  name = t.name,
                  [schema] = s.name,
                  type = 'base_table',
                  isSystemTable = CAST(t.is_ms_shipped AS bit),
                  [rowCount] = rc.rows,
                  lastModified = t.modify_date,

                  columns = JSON_QUERY((
                      SELECT
                          name = c.name,
                          displayName = NULL,
                          description = NULL,
                          dataType = ty.name,
                          normalizedType = ISNULL(tm.normalizedType,'string'),
                          isNullable = CAST(c.is_nullable AS bit),
                          isPrimaryKey = CAST(CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS bit),
                          isForeignKey = CAST(CASE WHEN fk.column_id IS NOT NULL THEN 1 ELSE 0 END AS bit),
                          isUnique = CAST(CASE WHEN uq.column_id IS NOT NULL THEN 1 ELSE 0 END AS bit),
                          isAutoIncrement = CAST(c.is_identity AS bit),
                          isComputed = CAST(c.is_computed AS bit),
                          maxLength = c.max_length,
                          precision = c.precision,
                          scale = c.scale,
                          defaultValue = dc.definition,
                          ordinalPosition = c.column_id,
                          foreignKeyReference = CASE 
                              WHEN fk.column_id IS NOT NULL THEN JSON_QUERY((
                                  SELECT
                                      referencedTable = fk.referencedTable,
                                      referencedColumn = fk.referencedColumn,
                                      constraintName = fk.constraintName,
                                      onDeleteAction = fk.onDeleteAction,
                                      onUpdateAction = fk.onUpdateAction
                                  FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                              ))
                              ELSE NULL 
                          END
                      FROM sys.columns c WITH (NOLOCK)
                      JOIN sys.types ty WITH (NOLOCK) ON ty.user_type_id = c.user_type_id
                      LEFT JOIN TypeMap tm ON tm.type_name = ty.name
                      LEFT JOIN PrimaryKeys pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
                      LEFT JOIN UniqueKeys uq ON uq.object_id = c.object_id AND uq.column_id = c.column_id
                      LEFT JOIN ForeignKeys fk ON fk.object_id = c.object_id AND fk.column_id = c.column_id
                      LEFT JOIN sys.default_constraints dc WITH (NOLOCK)
                          ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                      WHERE c.object_id = t.object_id
                      ORDER BY c.column_id
                      FOR JSON PATH
                  )),

                  indexes = JSON_QUERY((
                      SELECT
                          name = i.name,
                          type = CASE
                              WHEN i.type = 1 THEN 'clustered'
                              WHEN i.type = 2 THEN 'non_clustered'
                              WHEN i.is_unique = 1 THEN 'unique'
                              WHEN i.type = 4 THEN 'full_text'
                              WHEN i.type = 5 THEN 'spatial'
                              ELSE 'non_clustered'
                          END,
                          isUnique = CAST(i.is_unique AS bit),
                          isPrimaryKey = CAST(i.is_primary_key AS bit),
                          isClustered = CAST(CASE WHEN i.type = 1 THEN 1 ELSE 0 END AS bit),
                          columns = JSON_QUERY((
                              SELECT
                                  columnName = c.name,
                                  sortOrder = CASE WHEN ic.is_descending_key = 1 THEN 'desc' ELSE 'asc' END,
                                  ordinalPosition = ic.key_ordinal,
                                  isIncludedColumn = CAST(ic.is_included_column AS bit)
                              FROM sys.index_columns ic WITH (NOLOCK)
                              JOIN sys.columns c WITH (NOLOCK) 
                                ON c.object_id = ic.object_id AND c.column_id = ic.column_id
                              WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
                              ORDER BY ic.key_ordinal
                              FOR JSON PATH
                          ))
                      FROM sys.indexes i WITH (NOLOCK)
                      WHERE i.object_id = t.object_id AND i.index_id > 0 AND i.is_hypothetical = 0
                      ORDER BY i.name
                      FOR JSON PATH
                  ))
              FROM sys.tables t WITH (NOLOCK)
              JOIN sys.schemas s WITH (NOLOCK) ON s.schema_id = t.schema_id
              LEFT JOIN RowCounts rc ON rc.object_id = t.object_id
              WHERE ${tableFilter}
              ORDER BY s.name, t.name
              FOR JSON PATH
          )),

          ${viewsQuery}

          ${proceduresQuery}

          relationships = JSON_QUERY((
              SELECT
                  id = fk.name,
                  name = fk.name,
                  parentTable = pt.name,
                  childTable = ct.name,
                  columnMappings = JSON_QUERY((
                      SELECT
                          parentColumn = pc.name,
                          childColumn = cc.name
                      FROM sys.foreign_key_columns fkc2 WITH (NOLOCK)
                      JOIN sys.columns pc WITH (NOLOCK)
                        ON pc.object_id = fkc2.referenced_object_id AND pc.column_id = fkc2.referenced_column_id
                      JOIN sys.columns cc WITH (NOLOCK)
                        ON cc.object_id = fkc2.parent_object_id AND cc.column_id = fkc2.parent_column_id
                      WHERE fkc2.constraint_object_id = fk.object_id
                      ORDER BY parentColumn, childColumn
                      FOR JSON PATH
                  )),
                  type = 'foreign_key',
                  cardinality = 'one_to_many',
                  isEnforced = CAST(CASE WHEN fk.is_disabled = 0 AND fk.is_not_trusted = 0 THEN 1 ELSE 0 END AS bit),
                  confidence = CAST(1.0 AS decimal(3,2)),
                  detectionMethod = 'foreign_key_constraint'
              FROM sys.foreign_keys fk WITH (NOLOCK)
              JOIN sys.tables pt WITH (NOLOCK) ON pt.object_id = fk.referenced_object_id
              JOIN sys.tables ct WITH (NOLOCK) ON ct.object_id = fk.parent_object_id
              ORDER BY fk.name
              FOR JSON PATH
          )),

          [statistics] = JSON_QUERY((
            SELECT *
            FROM TableStats
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
          ))
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
      );
		`);

		console.log('Schema rows:', rows);

		const text = rows?.[0]?.json ?? rows?.[0]?.['JSON_F52E2B61-18A1-11d1-B105-00805F49916B'];
		
		// Connection is cached and reused, so we don't close it here
		
		return JSON.parse(text) as any;

    } catch (error) {
      console.error('Error introspecting database:', error);
      
      // If connection was just created and error occurred, remove it from cache
      if (connection) {
        const connectionKey = this.generateConnectionKey(server, port, database, username, type);
        if (this.connectionCache.has(connectionKey)) {
          try {
            await connection.destroy();
          } catch (closeError) {
            console.error('Error closing failed connection:', closeError);
          }
          this.connectionCache.delete(connectionKey);
        }
      }
      
      throw error;
    }
  }

  /**
   * Maps a database type string to the corresponding TypeORM driver name.
   * 
   * This method converts user-friendly database type names to the driver names
   * expected by TypeORM for connection configuration.
   * 
   * @private
   * @param {string} type - Database type (e.g., 'sqlserver', 'mysql', 'postgresql', 'oracle')
   * @returns {string} The corresponding TypeORM driver name
   * 
   * @example
   * mapDatabaseTypeToDriver('sqlserver') // Returns 'mssql'
   * mapDatabaseTypeToDriver('postgresql') // Returns 'postgres'
   * mapDatabaseTypeToDriver('mysql') // Returns 'mysql'
   * 
   * @remarks
   * - Returns the input type unchanged if no mapping is found
   * - Case-insensitive matching
   */
  private mapDatabaseTypeToDriver(type: string): string {
    const typeMap: { [key: string]: string } = {
      'sqlserver': 'mssql',
      'mysql': 'mysql',
      'postgresql': 'postgres',
      'oracle': 'oracle'
    };
    return typeMap[type.toLowerCase()] || type;
  }
}
