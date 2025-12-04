import { DatabaseSchema } from "src/types/database-schema.type";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Report } from "./report.entity";

export enum DatabaseType {
  SQLSERVER = 'sqlserver',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  ORACLE = 'oracle'
}

// entities/data-source.entity.ts
@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  server?: string;

  @Column({ type: 'int', nullable: true })
  port?: number;

  @Column({ length: 255, nullable: true })
  database?: string;

  @Column({ length: 255, nullable: true })
  username?: string;

  @Column({ length: 255, nullable: true })
  password?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'mssql'
  })
  type: DatabaseType;

  @Column("simple-json", { nullable: true })
  schema: DatabaseSchema;

  // Schema filtering configuration
  @Column("simple-json", { nullable: true })
  includedSchemas?: string[]; // Which schemas to include (e.g., ['dbo', 'custom'])

  @Column("simple-json", { nullable: true })
  includedObjectTypes?: string[]; // Which object types to include (e.g., ['table', 'view'])

  @Column({ type: 'varchar', length: 500, nullable: true })
  objectNamePattern?: string; // Pattern for filtering objects by name (e.g., 'Customer%')

  @OneToMany(() => Report, report => report.dataSource)
  reports: Report[];
}
