export enum RealtimeWorkerRequestType {
  Connect = "connect",
  Disconnect = "disconnect",
  ReconnectNow = "reconnectNow",
}

export enum RealtimeWorkerResponseType {
  Status = "status",
  Message = "message",
  ServerNow = "serverNow",
  Error = "error",
  AuthExpired = "authExpired",
}
