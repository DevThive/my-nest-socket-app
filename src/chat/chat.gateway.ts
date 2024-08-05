import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service'; // RedisService를 임포트합니다.

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // 클라이언트의 URL
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: { [key: string]: Set<Socket> } = {}; // 방 관리
  private users: { [key: string]: string } = {}; // 사용자 관리 (소켓 ID와 사용자 이름 매핑)

  constructor(private readonly redisService: RedisService) {} // RedisService 주입

  handleConnection(client: Socket) {
    console.log('New client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);

    // 클라이언트가 속한 방에서 클라이언트를 제거
    for (const room in this.rooms) {
      if (this.rooms[room].has(client)) {
        this.rooms[room].delete(client);
        // 방에 클라이언트가 없으면 방 제거
        if (this.rooms[room].size === 0) {
          delete this.rooms[room];
        }
      }
    }

    // 사용자 목록에서 해당 사용자 제거
    delete this.users[client.id];

    // 방 목록 및 사용자 목록 업데이트
    this.server.emit('updateRooms', this.getActiveRooms());
    this.server.emit('updateUsers', this.getActiveUsers());
  }

  @SubscribeMessage('join')
  async handleJoinRoom(
    client: Socket,
    { room, username }: { room: string; username: string },
  ): Promise<void> {
    if (!this.rooms[room]) {
      this.rooms[room] = new Set<Socket>(); // 방이 없으면 새로 생성
    }
    this.rooms[room].add(client); // 클라이언트를 방에 추가
    client.join(room); // 소켓을 방에 추가
    console.log(`Client ${client.id} joined room: ${room} as ${username}`);

    this.users[client.id] = username; // 클라이언트 ID와 사용자 이름 매핑

    // 방 목록 및 사용자 목록 업데이트
    this.server.emit('updateRooms', this.getActiveRooms());
    this.server.emit('updateUsers', this.getActiveUsers());

    // 새로운 유저가 들어왔음을 다른 클라이언트에 알림
    this.server.emit('userJoined', { id: client.id, username });

    // Redis에 방 정보 저장
    await this.redisService.saveMessage(room, {
      user: username,
      action: 'joined',
    });
  }

  private getActiveRooms() {
    return Object.keys(this.rooms).map((room) => ({ name: room }));
  }

  private getActiveUsers() {
    return Object.keys(this.users).map((id) => ({
      id,
      username: this.users[id],
    }));
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    payload: { room: string; user: string; text: string },
  ): Promise<void> {
    console.log('Received message:', payload); // 수신된 메시지 확인
    this.server.to(payload.room).emit('message', payload); // 해당 방의 클라이언트에게 메시지 전송

    // Redis에 메시지 저장
    await this.redisService.saveMessage(payload.room, payload);
  }

  @SubscribeMessage('privateMessage')
  async handlePrivateMessage(
    client: Socket,
    payload: { from: string; to: string; message: string },
  ): Promise<void> {
    const toClient = this.getClientByUsername(payload.to);
    if (toClient) {
      // 상대방에게 메시지 전송
      this.server.to(toClient.id).emit('privateMessage', {
        from: payload.from,
        message: payload.message,
      });

      // Redis에 메시지 저장 (5분 동안 유지)
      const chatKey = `${payload.from}-${payload.to}`;
      await this.redisService.saveMessage(chatKey, {
        from: payload.from,
        to: payload.to,
        message: payload.message,
      });
    }
  }

  private getClientByUsername(username: string): Socket | null {
    const clientId = Object.keys(this.users).find(
      (id) => this.users[id] === username,
    );
    return clientId ? this.server.sockets.sockets.get(clientId) || null : null;
  }

  @SubscribeMessage('getUsers')
  handleGetUsers(client: Socket): void {
    console.log('사용자 목록 요청 수신');
    const userList = this.getActiveUsers();
    client.emit('updateUsers', userList);
  }

  // 추가: 이미지 메시지를 처리하는 메소드
  @SubscribeMessage('image')
  handleImage(
    client: Socket,
    payload: { room: string; user: string; image: string },
  ): void {
    this.server.to(payload.room).emit('message', payload); // 해당 방의 클라이언트에게 이미지 메시지 전송
  }
}
