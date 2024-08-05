import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat/chat.gateway';
import { RedisService } from './redis/redis.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ChatGateway, RedisService],
})
export class AppModule {}
