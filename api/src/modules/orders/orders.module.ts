import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { FiscalCoreModule } from '../fiscal-core/fiscal-core.module';

@Module({
  imports: [FiscalCoreModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
