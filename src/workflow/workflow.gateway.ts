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

  emitLog(runId: string, message: string) {
    this.server.emit('log', { runId, message });
  }

  emitComplete(runId: string, result: string) {
    this.server.emit('complete', { runId, result });
  }
}
