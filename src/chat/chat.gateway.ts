// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // 클라이언트의 URL
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('New client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    console.log('Received message:', payload); // 수신된 메시지 확인
    this.server.emit('message', payload); // 모든 클라이언트에게 메시지 전송
  }

  // 추가: 이미지 메시지를 처리하는 메소드
  @SubscribeMessage('image')
  handleImage(client: Socket, payload: any): void {
    this.server.emit('message', payload); // 이미지 메시지를 모든 클라이언트에게 전송
  }
}
