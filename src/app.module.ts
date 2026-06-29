import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { OverviewService } from './overview/overview.service';
import { OverviewController } from './overview/overview.controller';
import { RabbitMQConsumerService } from './rabbitmq/rabbitmq-consumer.service';
import { HealthController } from './health.controller';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SettingsModule,
  ],
  controllers: [OverviewController, HealthController],
  providers: [OverviewService, RabbitMQConsumerService],
})
export class AppModule {}
