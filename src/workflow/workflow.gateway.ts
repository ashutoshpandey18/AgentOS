import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WorkflowGateway {
  @WebSocketServer()
  server!: Server;

  emitLog(message: string) {
    this.server.emit('log', message);
  }

  emitComplete(result: string) {
    this.server.emit('complete', { result });
  }
}
