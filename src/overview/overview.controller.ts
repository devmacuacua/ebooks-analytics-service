import { Controller, ForbiddenException, Get, Query, Req } from '@nestjs/common';
import { OverviewService } from './overview.service';

@Controller('analytics')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('dashboard')
  dashboard(@Req() req) {
    this.requireAdmin(req);
    return this.overviewService.getDashboard();
  }

  @Get('revenue/series')
  revenueSeries(
    @Req() req,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    this.requireAdmin(req);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();
    return this.overviewService.getRevenueSeries(fromDate, toDate);
  }

  @Get('books/top')
  topBooks(
    @Req() req,
    @Query('limit') limit = 10,
    @Query('type') type: 'purchased' | 'read_session' = 'purchased',
  ) {
    this.requireAdmin(req);
    return this.overviewService.getTopBooks(+limit, type);
  }

  @Get('deliveries/by-province')
  deliveriesByProvince(@Req() req) {
    this.requireAdmin(req);
    return this.overviewService.getDeliveriesByProvince();
  }

  @Get('admin/stats')
  adminStats(@Req() req) {
    this.requireAdmin(req);
    return this.overviewService.getAdminStats();
  }

  private requireAdmin(req: any) {
    if (req.headers['x-user-role'] !== 'ADMIN') throw new ForbiddenException();
  }
}
