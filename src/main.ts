import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: 'https://random-chat-tau.vercel.app', // 허용할 출처
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 허용할 HTTP 메서드
    credentials: true, // 쿠키와 같은 인증 정보를 포함할지 여부
  });

  await app.listen(4000);
}
bootstrap();
