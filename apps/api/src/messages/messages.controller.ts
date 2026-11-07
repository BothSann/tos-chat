import { Controller, Get, Param, Query } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { ParseCuidPipe } from '../common/parse-cuid.pipe.js';
import { ListMessagesDto } from './list-messages.dto.js';
import { MessagePageResponse } from './message.response.js';
import { MessagesService } from './messages.service.js';

@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async list(
    @Session() session: UserSession,
    @Param('id', new ParseCuidPipe('Room')) id: string,
    @Query() query: ListMessagesDto,
  ): Promise<MessagePageResponse> {
    const page = await this.messagesService.list(session.user.id, id, query);

    return MessagePageResponse.from(page);
  }
}
