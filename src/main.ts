import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'https://random-chat-tau.vercel.app', // 허용할 출처
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Socket.IO 관련 설정
  app.useWebSocketAdapter(new IoAdapter(app)); // Socket.IO 어댑터 사용

  await app.listen(4000);
}
bootstrap();
