import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SettingsMap {
  siteName: string;
  supportEmail: string;
  deliveryFee: string;
  maxItemsPerOrder: string;
  enableSubscriptions: boolean;
  enablePartnerProgram: boolean;
  enablePhysicalBooks: boolean;
  maintenanceMode: boolean;
}

const BOOL_KEYS = new Set([
  'enableSubscriptions',
  'enablePartnerProgram',
  'enablePhysicalBooks',
  'maintenanceMode',
]);

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<SettingsMap> {
    const rows = await this.prisma.platformSetting.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    return {
      siteName: map['siteName'] ?? 'EBooksStore',
      supportEmail: map['supportEmail'] ?? 'suporte@ebooks.co.mz',
      deliveryFee: map['deliveryFee'] ?? '150',
      maxItemsPerOrder: map['maxItemsPerOrder'] ?? '10',
      enableSubscriptions: (map['enableSubscriptions'] ?? 'true') === 'true',
      enablePartnerProgram: (map['enablePartnerProgram'] ?? 'true') === 'true',
      enablePhysicalBooks: (map['enablePhysicalBooks'] ?? 'true') === 'true',
      maintenanceMode: (map['maintenanceMode'] ?? 'false') === 'true',
    };
  }

  async upsertMany(settings: Partial<SettingsMap>, updatedBy: string): Promise<SettingsMap> {
    const entries = Object.entries(settings) as [keyof SettingsMap, unknown][];
    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: String(BOOL_KEYS.has(key) ? Boolean(value) : value), updatedBy },
          create: { key, value: String(BOOL_KEYS.has(key) ? Boolean(value) : value), updatedBy },
        }),
      ),
    );
    return this.getAll();
  }
}
