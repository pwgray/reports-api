import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from 'src/entities/user.entity';

describe('UserModule', () => {
  let module: TestingModule;

  // Mock repository
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have UserService', () => {
    const service = module.get<UserService>(UserService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(UserService);
  });

  it('should provide UserService', () => {
    const service = module.get<UserService>(UserService);
    expect(service).toBeDefined();
  });

  it('should inject UserRepository into UserService', () => {
    const service = module.get<UserService>(UserService);
    expect(service).toBeDefined();
    // Service is properly instantiated with mocked repository
  });

  it('should compile module successfully', async () => {
    const testModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    expect(testModule).toBeDefined();
    expect(testModule.get<UserService>(UserService)).toBeDefined();
  });
});
