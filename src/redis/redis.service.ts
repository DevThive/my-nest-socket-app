import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: 'redis-19888.c340.ap-northeast-2-1.ec2.redns.redis-cloud.com',
      port: 19888,
      password: '2c04eodDeVjlC5omi4NMGPhoUSwF1ifq', // 여기에 실제 비밀번호를 입력하세요
    });

    this.checkConnection(); // 생성자에서 연결 확인 메서드 호출
  }

  private async checkConnection() {
    try {
      const response = await this.client.ping(); // Redis 서버에 ping 요청
      if (response === 'PONG') {
        console.log('연결 성공: Redis 서버에 연결되었습니다.'); // 연결 성공시 출력
      }
    } catch (error) {
      console.error('Redis 연결 오류:', error.message); // 연결 실패시 출력
    }
  }

  getClient() {
    return this.client;
  }

  async saveMessage(room: string, message: any) {
    try {
      await this.client.rpush(`chat:${room}`, JSON.stringify(message)); // 메시지를 Redis 리스트에 저장
      await this.client.expire(`chat:${room}`, 300); // 5분 후에 자동 삭제 설정
    } catch (error) {
      console.error('메시지 저장 오류:', error.message); // 에러 로그 출력
    }
  }

  async getMessages(room: string) {
    try {
      const messages = await this.client.lrange(`chat:${room}`, 0, -1);
      return messages.map((msg) => JSON.parse(msg)); // 저장된 메시지를 읽어 JSON으로 변환
    } catch (error) {
      console.error('메시지 가져오기 오류:', error.message); // 에러 로그 출력
      return []; // 에러 발생 시 빈 배열 반환
    }
  }

  onModuleDestroy() {
    this.client.quit(); // 모듈이 파괴될 때 Redis 연결 종료
  }
}
