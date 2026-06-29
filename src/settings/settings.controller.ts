import { Body, Controller, ForbiddenException, Get, Put, Req } from '@nestjs/common';
import { SettingsService, SettingsMap } from './settings.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Settings')
@Controller('analytics/admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get platform settings (admin only)' })
  get(@Req() req: any) {
    this.requireAdmin(req);
    return this.settingsService.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Update platform settings (admin only)' })
  update(@Req() req: any, @Body() body: Partial<SettingsMap>) {
    this.requireAdmin(req);
    const updatedBy = req.headers['x-user-id'] ?? 'admin';
    return this.settingsService.upsertMany(body, updatedBy);
  }

  private requireAdmin(req: any) {
    if (req.headers['x-user-role'] !== 'ADMIN') throw new ForbiddenException();
  }
}
