import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from 'src/entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        reports: [],
      } as User;

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['reports'],
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(userId)).rejects.toThrow(
        `User with ID ${userId} not found`
      );
    });

    it('should include reports relation', async () => {
      const userId = 'user-456';
      const mockUser = {
        id: userId,
        email: 'user@example.com',
        reports: [
          { id: 'report-1', name: 'Report 1' },
          { id: 'report-2', name: 'Report 2' },
        ],
      } as User;

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result.reports).toBeDefined();
      expect(result.reports).toHaveLength(2);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['reports'],
      });
    });

    it('should handle UUID format user IDs', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = { id: uuidId, email: 'user@example.com' } as User;
      mockRepository.findOne.mockResolvedValue(mockUser);

      await service.findById(uuidId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: uuidId },
        relations: ['reports'],
      });
    });

    it('should handle repository errors', async () => {
      const userId = 'user-error';
      const error = new Error('Database connection error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findById(userId)).rejects.toThrow('Database connection error');
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const email = 'user@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        reports: [],
      } as User;

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['reports'],
      });
      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['reports'],
      });
    });

    it('should include reports relation', async () => {
      const email = 'user@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        reports: [{ id: 'report-1' }],
      } as User;

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result?.reports).toBeDefined();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['reports'],
      });
    });

    it('should handle different email formats', async () => {
      const email = 'test.user+tag@example.co.uk';
      const mockUser = { id: 'user-123', email } as User;
      mockRepository.findOne.mockResolvedValue(mockUser);

      await service.findByEmail(email);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email },
        relations: ['reports'],
      });
    });

    it('should handle repository errors', async () => {
      const email = 'error@example.com';
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findByEmail(email)).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'hashedPassword',
      } as Partial<User>;

      const createdUser = {
        id: 'user-new',
        ...userData,
        createdAt: new Date(),
      } as User;

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle partial user data', async () => {
      const userData = {
        email: 'minimal@example.com',
      } as Partial<User>;

      const createdUser = {
        id: 'user-minimal',
        ...userData,
      } as User;

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(repository.create).toHaveBeenCalledWith(userData);
    });

    it('should handle save errors', async () => {
      const userData = { email: 'error@example.com' } as Partial<User>;
      const error = new Error('Save failed');
      
      mockRepository.create.mockReturnValue({} as User);
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(userData)).rejects.toThrow('Save failed');
    });

    it('should create user with all properties', async () => {
      const userData = {
        email: 'fulluser@example.com',
        name: 'Full User',
        password: 'hashedPassword',
        role: 'admin',
        isActive: true,
      } as Partial<User>;

      const createdUser = {
        id: 'user-full',
        ...userData,
      } as User;

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(result.email).toBe('fulluser@example.com');
      expect(result.name).toBe('Full User');
      expect(result.role).toBe('admin');
    });
  });

  describe('update', () => {
    it('should update a user and return updated user', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      } as Partial<User>;

      const updatedUser = {
        id: userId,
        ...updateData,
        reports: [],
      } as User;

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(repository.update).toHaveBeenCalledWith(userId, updateData);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['reports'],
      });
    });

    it('should handle partial updates', async () => {
      const userId = 'user-456';
      const updateData = { name: 'New Name' } as Partial<User>;
      const updatedUser = {
        id: userId,
        name: 'New Name',
        email: 'existing@example.com',
      } as User;

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(result.name).toBe('New Name');
      expect(repository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw NotFoundException when user not found during update', async () => {
      const userId = 'non-existent';
      const updateData = { name: 'Updated' } as Partial<User>;

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(userId, updateData)).rejects.toThrow(NotFoundException);
      await expect(service.update(userId, updateData)).rejects.toThrow(
        `User with ID ${userId} not found`
      );
    });

    it('should handle update errors', async () => {
      const userId = 'user-error';
      const updateData = { name: 'Updated' } as Partial<User>;
      const error = new Error('Update failed');

      mockRepository.update.mockRejectedValue(error);

      await expect(service.update(userId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete a user successfully', async () => {
      const userId = 'user-123';
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(userId);

      expect(repository.delete).toHaveBeenCalledWith(userId);
      expect(repository.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete(userId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(userId)).rejects.toThrow(
        `User with ID ${userId} not found`
      );
    });

    it('should handle multiple deletions', async () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      mockRepository.delete
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 1 });

      await service.delete(userId1);
      await service.delete(userId2);

      expect(repository.delete).toHaveBeenCalledTimes(2);
      expect(repository.delete).toHaveBeenCalledWith(userId1);
      expect(repository.delete).toHaveBeenCalledWith(userId2);
    });

    it('should handle repository errors', async () => {
      const userId = 'user-error';
      const error = new Error('Delete failed');
      mockRepository.delete.mockRejectedValue(error);

      await expect(service.delete(userId)).rejects.toThrow('Delete failed');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          reports: [],
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          reports: [],
        },
        {
          id: 'user-3',
          email: 'user3@example.com',
          name: 'User 3',
          reports: [],
        },
      ] as User[];

      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(3);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['reports'],
      });
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['reports'],
      });
    });

    it('should include reports relation for all users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          reports: [{ id: 'report-1' }],
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          reports: [{ id: 'report-2' }, { id: 'report-3' }],
        },
      ] as User[];

      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result[0].reports).toBeDefined();
      expect(result[1].reports).toBeDefined();
      expect(result[1].reports).toHaveLength(2);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['reports'],
      });
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database connection error');
      mockRepository.find.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Database connection error');
    });
  });
});
