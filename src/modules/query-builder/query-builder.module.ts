import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueryBuilderService } from "./query-builder.service";
import { DataSourceService } from "./data-source.service";
import { DataSource } from "../../entities/data-source.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([DataSource])
  ],
  providers: [QueryBuilderService, DataSourceService],
  exports: [QueryBuilderService, DataSourceService],
})
export class QueryBuilderModule {}