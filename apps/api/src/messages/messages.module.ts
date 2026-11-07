import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { MessagesRepository } from './messages.repository.js';

@Module({
  imports: [PrismaModule, RoomsModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRepository],
})
export class MessagesModule {}
