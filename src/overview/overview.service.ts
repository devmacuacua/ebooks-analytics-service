import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const last30 = new Date(today); last30.setDate(today.getDate() - 30);

    const [
      todayRevenue, monthRevenue, totalRevenue,
      todayUsers, totalUsers,
      activeSubscriptions, monthSubscriptions,
      todayOrders, pendingDeliveries,
      recentSnapshot,
    ] = await Promise.all([
      this.prisma.revenueEvent.aggregate({ where: { eventDate: { gte: today } }, _sum: { amount: true }, _count: true }),
      this.prisma.revenueEvent.aggregate({ where: { eventDate: { gte: firstOfMonth } }, _sum: { amount: true }, _count: true }),
      this.prisma.revenueEvent.aggregate({ _sum: { amount: true }, _count: true }),
      this.prisma.userEvent.count({ where: { eventType: 'registered', eventDate: { gte: today } } }),
      this.prisma.userEvent.count({ where: { eventType: 'registered' } }),
      this.prisma.subscriptionEvent.count({ where: { eventType: 'created' } }),
      this.prisma.subscriptionEvent.count({ where: { eventType: 'created', eventDate: { gte: firstOfMonth } } }),
      this.prisma.revenueEvent.count({ where: { eventDate: { gte: today } } }),
      this.prisma.deliveryEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.dailySnapshot.findFirst({ orderBy: { snapshotDate: 'desc' } }),
    ]);

    return {
      revenue: {
        today: todayRevenue._sum.amount ?? 0,
        thisMonth: monthRevenue._sum.amount ?? 0,
        allTime: totalRevenue._sum.amount ?? 0,
        todayOrders: todayOrders,
        monthOrders: monthRevenue._count,
      },
      users: { today: todayUsers, total: totalUsers },
      subscriptions: { active: activeSubscriptions, thisMonth: monthSubscriptions },
      deliveries: { pending: pendingDeliveries },
      lastSnapshot: recentSnapshot,
    };
  }

  async getAdminStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayRev, monthRev, totalUsers, subs, expiredSubs, todayOrders, pendingDels] = await Promise.all([
      this.prisma.revenueEvent.aggregate({ where: { eventDate: { gte: today } }, _sum: { amount: true } }),
      this.prisma.revenueEvent.aggregate({ where: { eventDate: { gte: firstOfMonth } }, _sum: { amount: true } }),
      this.prisma.userEvent.count({ where: { eventType: 'registered' } }),
      this.prisma.subscriptionEvent.count({ where: { eventType: 'created' } }),
      this.prisma.subscriptionEvent.count({ where: { eventType: { in: ['expired', 'cancelled'] } } }),
      this.prisma.revenueEvent.count({ where: { eventDate: { gte: today } } }),
      this.prisma.deliveryEvent.count({ where: { status: 'PENDING' } }),
    ]);

    const [{ count: totalBooksRaw }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "bookId")::int AS count FROM book_events
    `;

    return {
      totalBooks: Number(totalBooksRaw ?? 0),
      ordersToday: todayOrders,
      revenueToday: Number(todayRev._sum.amount ?? 0),
      revenueMonth: Number(monthRev._sum.amount ?? 0),
      activeSubscriptions: Math.max(0, subs - expiredSubs),
      totalUsers,
      pendingOrders: pendingDels,
    };
  }

  async getRevenueSeries(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT "eventDate"::text AS date,
             COUNT(*)::int      AS orders,
             SUM("amount")      AS revenue,
             "paymentMethod"
      FROM revenue_events
      WHERE "eventDate" BETWEEN ${from} AND ${to}
      GROUP BY "eventDate", "paymentMethod"
      ORDER BY "eventDate"
    `;
    return rows;
  }

  async getTopBooks(limit = 10, eventType: 'purchased' | 'read_session' = 'purchased') {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT "bookId", "bookTitle", COUNT(*)::int AS count
      FROM book_events
      WHERE "eventType" = ${eventType}
      GROUP BY "bookId", "bookTitle"
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return rows;
  }

  async getDeliveriesByProvince() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT province, status, COUNT(*)::int AS count
      FROM delivery_events
      GROUP BY province, status
      ORDER BY province, status
    `;
    return rows;
  }

  // Snapshot diário — corre todo os dias à meia-noite
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async buildDailySnapshot() {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);

    const [revenue, newUsers, newSubs, pendingDel, completedDel] = await Promise.all([
      this.prisma.revenueEvent.aggregate({ where: { eventDate: yesterday }, _sum: { amount: true }, _count: true }),
      this.prisma.userEvent.count({ where: { eventType: 'registered', eventDate: yesterday } }),
      this.prisma.subscriptionEvent.count({ where: { eventType: 'created', eventDate: yesterday } }),
      this.prisma.deliveryEvent.count({ where: { status: 'PENDING', eventDate: yesterday } }),
      this.prisma.deliveryEvent.count({ where: { status: 'DELIVERED', eventDate: yesterday } }),
    ]);

    const activeSubscriptions = await this.prisma.subscriptionEvent.count({ where: { eventType: 'created' } })
      - await this.prisma.subscriptionEvent.count({ where: { eventType: { in: ['expired', 'cancelled'] } } });

    await this.prisma.dailySnapshot.upsert({
      where: { snapshotDate: yesterday },
      create: {
        snapshotDate: yesterday,
        totalRevenue: revenue._sum.amount ?? 0,
        totalOrders: revenue._count,
        newUsers,
        activeSubscriptions: Math.max(0, activeSubscriptions),
        newSubscriptions: newSubs,
        pendingDeliveries: pendingDel,
        completedDeliveries: completedDel,
      },
      update: {},
    });
  }
}
