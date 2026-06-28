import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { PrismaService } from '../prisma/prisma.service';

const EXCHANGE = 'ebooks.events';
const QUEUE = 'analytics-service-queue';
const BINDINGS = [
  'commerce.order.paid',
  'commerce.subscription.created',
  'commerce.subscription.expired',
  'user.registered',
  'delivery.status.updated',
  'delivery.created',
  'catalog.book.purchased',
  'reading.session.started',
];

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() { await this.connect(); }

  private async connect() {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL!);
      const channel = await conn.createChannel();

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await channel.assertQueue(QUEUE, { durable: true });
      for (const key of BINDINGS) await channel.bindQueue(QUEUE, EXCHANGE, key);

      channel.prefetch(10);
      channel.consume(QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          await this.dispatch(msg.fields.routingKey, payload);
          channel.ack(msg);
        } catch (err) {
          this.logger.error(`Failed: ${msg.fields.routingKey}`, err);
          channel.nack(msg, false, false);
        }
      });

      conn.on('error', () => this.reconnect());
      conn.on('close', () => this.reconnect());
      this.logger.log('Connected to RabbitMQ');
    } catch {
      this.logger.error('RabbitMQ failed, retrying in 5s');
      setTimeout(() => this.connect(), 5000);
    }
  }

  private reconnect() { setTimeout(() => this.connect(), 5000); }

  private async dispatch(event: string, payload: any) {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    switch (event) {
      case 'commerce.order.paid':
        for (const item of payload.items ?? []) {
          await this.prisma.revenueEvent.upsert({
            where: { orderId: `${payload.orderId}-${item.orderItemId}` },
            create: {
              orderId: `${payload.orderId}-${item.orderItemId}`,
              amount: item.price,
              paymentMethod: payload.paymentMethod ?? 'unknown',
              bookType: item.type ?? 'EBOOK',
              currency: item.currency ?? 'MZN',
              eventDate: today,
            },
            update: {},
          });
          if (item.bookId) {
            await this.prisma.bookEvent.create({
              data: {
                bookId: item.bookId,
                bookTitle: item.bookTitle ?? '',
                bookType: item.type ?? 'EBOOK',
                eventType: 'purchased',
                eventDate: today,
              },
            });
          }
        }
        break;

      case 'commerce.subscription.created':
        await this.prisma.subscriptionEvent.upsert({
          where: { subscriptionId_eventType: { subscriptionId: payload.subscriptionId, eventType: 'created' } },
          create: { subscriptionId: payload.subscriptionId, planType: payload.planType, eventType: 'created', eventDate: today },
          update: {},
        });
        break;

      case 'commerce.subscription.expired':
        await this.prisma.subscriptionEvent.upsert({
          where: { subscriptionId_eventType: { subscriptionId: payload.subscriptionId, eventType: 'expired' } },
          create: { subscriptionId: payload.subscriptionId, planType: payload.planType ?? 'UNKNOWN', eventType: 'expired', eventDate: today },
          update: {},
        });
        break;

      case 'user.registered':
        await this.prisma.userEvent.create({
          data: { userId: payload.userId, eventType: 'registered', eventDate: today },
        });
        break;

      case 'delivery.created':
        await this.prisma.deliveryEvent.create({
          data: { deliveryId: payload.deliveryId, province: payload.province ?? '', status: 'PENDING', eventDate: today },
        });
        break;

      case 'delivery.status.updated':
        await this.prisma.deliveryEvent.create({
          data: { deliveryId: payload.deliveryId, province: payload.province ?? '', status: payload.status, eventDate: today },
        });
        break;

      case 'reading.session.started':
        await this.prisma.bookEvent.create({
          data: { bookId: payload.bookId, bookTitle: payload.bookTitle ?? '', eventType: 'read_session', eventDate: today },
        });
        break;
    }
  }
}
