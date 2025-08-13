import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QueryBuilderService } from "./query-builder.service";
import { DataSourceService } from "./data-source.service";
import { DataSource } from "../../entities/data-source.entity";
import { DataSourceController } from "./data-source.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([DataSource])
  ],
  controllers: [DataSourceController],
  providers: [QueryBuilderService, DataSourceService],
  exports: [QueryBuilderService, DataSourceService],
})
export class QueryBuilderModule {}