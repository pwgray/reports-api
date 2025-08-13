import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from '../../entities/data-source.entity';

@Injectable()
export class DataSourceService {
  constructor(
    @InjectRepository(DataSource)
    private readonly dataSourceRepository: Repository<DataSource>
  ) {}

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
}
