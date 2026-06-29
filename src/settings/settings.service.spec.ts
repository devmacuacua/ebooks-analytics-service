import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  platformSetting: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns defaults when DB is empty', async () => {
      mockPrisma.platformSetting.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result.siteName).toBe('EBooksStore');
      expect(result.supportEmail).toBe('suporte@ebooks.co.mz');
      expect(result.enableSubscriptions).toBe(true);
      expect(result.maintenanceMode).toBe(false);
    });

    it('converts boolean string values correctly', async () => {
      mockPrisma.platformSetting.findMany.mockResolvedValue([
        { key: 'enableSubscriptions', value: 'false' },
        { key: 'maintenanceMode', value: 'true' },
        { key: 'enablePartnerProgram', value: 'true' },
      ]);

      const result = await service.getAll();

      expect(result.enableSubscriptions).toBe(false);
      expect(result.maintenanceMode).toBe(true);
      expect(result.enablePartnerProgram).toBe(true);
    });

    it('returns persisted string values', async () => {
      mockPrisma.platformSetting.findMany.mockResolvedValue([
        { key: 'siteName', value: 'Minha Loja' },
        { key: 'deliveryFee', value: '200' },
      ]);

      const result = await service.getAll();

      expect(result.siteName).toBe('Minha Loja');
      expect(result.deliveryFee).toBe('200');
    });
  });

  describe('upsertMany', () => {
    it('calls prisma upsert for each setting', async () => {
      mockPrisma.platformSetting.upsert.mockResolvedValue({});
      mockPrisma.platformSetting.findMany.mockResolvedValue([]);

      await service.upsertMany(
        { siteName: 'Nova Loja', enableSubscriptions: false },
        'admin-1',
      );

      expect(mockPrisma.platformSetting.upsert).toHaveBeenCalledTimes(2);
    });

    it('stringifies boolean values', async () => {
      mockPrisma.platformSetting.upsert.mockResolvedValue({});
      mockPrisma.platformSetting.findMany.mockResolvedValue([]);

      await service.upsertMany({ maintenanceMode: true }, 'admin-1');

      expect(mockPrisma.platformSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ value: 'true' }),
        }),
      );
    });

    it('returns updated settings after upsert', async () => {
      mockPrisma.platformSetting.upsert.mockResolvedValue({});
      mockPrisma.platformSetting.findMany.mockResolvedValue([
        { key: 'siteName', value: 'Actualizado' },
      ]);

      const result = await service.upsertMany({ siteName: 'Actualizado' }, 'admin-1');

      expect(result.siteName).toBe('Actualizado');
    });
  });
});
