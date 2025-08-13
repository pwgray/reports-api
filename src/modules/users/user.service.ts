import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}   

    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ 
            where: { id },
            relations: ['reports']
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ 
            where: { email },
            relations: ['reports']
        });
    }

    async create(userData: Partial<User>): Promise<User> {
        const user = this.userRepository.create(userData);
        return this.userRepository.save(user);
    }

    async update(id: string, userData: Partial<User>): Promise<User> {
        await this.userRepository.update(id, userData);
        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        const result = await this.userRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find({
            relations: ['reports']
        });
    }
}