import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { UserResponse } from './user.response.js';

@Controller('me')
export class UsersController {
  @Get()
  me(@Session() session: UserSession): UserResponse {
    return UserResponse.from(session.user);
  }
}
