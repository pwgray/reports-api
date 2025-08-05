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

  @Column({ length: 500 })
  connectionString: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: DatabaseType
  })
  type: DatabaseType;

  @Column("simple-json", { nullable: true })
  schema: DatabaseSchema;

  @OneToMany(() => Report, report => report.dataSource)
  reports: Report[];
}
