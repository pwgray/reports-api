import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createConnection, Repository } from 'typeorm';
import { DataSource } from '../../entities/data-source.entity';
import { DatabaseSchema, DatabaseType } from 'src/types/database-schema.type';

@Injectable()
export class DataSourceService {
  constructor(
    @InjectRepository(DataSource)
    private readonly dataSourceRepository: Repository<DataSource>
  ) { }

  async findById(id: string): Promise<DataSource> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id }
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    return dataSource;
  }

  async create(dataSource: Partial<DataSource>): Promise<DataSource> {
    const newDataSource = this.dataSourceRepository.create(dataSource);
    return await this.dataSourceRepository.save(newDataSource);
  }

  async update(id: string, dataSource: Partial<DataSource>): Promise<DataSource> {
    await this.dataSourceRepository.update(id, dataSource);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.dataSourceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }
  }

  async findAll(): Promise<DataSource[]> {
    return this.dataSourceRepository.find();
  }

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

    try {
      console.log('🔍 Introspecting with filters:', { 
        includedSchemas, 
        includedObjectTypes, 
        objectNamePattern 
      });

      // Map generic database type to TypeORM driver name
      const driverType = this.mapDatabaseTypeToDriver(type);
      
      // Create unique connection name to avoid conflicts
      const connectionName = `introspect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const connectionOptions: any = {
        name: connectionName,
        type: driverType,
        host: server,
        database: database,
        username: username,
        password: password,
      };

      // Add port if provided
      if (port) {
        connectionOptions.port = port;
      }

      // Add database-specific options
      if (driverType === 'mssql') {
        connectionOptions.options = {
          trustServerCertificate: true,
          encrypt: false,
          enableArithAbort: true,
        };
      }

      const connection = await createConnection(connectionOptions);

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

          views = ${includeViews ? 'JSON_QUERY((' : 'NULL -- views = JSON_QUERY(('}
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
          ${includeViews ? '))' : '))'}, -- end views

          procedures = ${includeProcedures ? 'JSON_QUERY((' : 'NULL -- procedures = JSON_QUERY(('}
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
          ${includeProcedures ? '))' : '))'}, -- end procedures

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
		
		// Close connection after introspection
		await connection.close();
		
		return JSON.parse(text) as any;

    } catch (error) {
      console.error('Error introspecting database:', error);
      throw error;
    }
  }

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
