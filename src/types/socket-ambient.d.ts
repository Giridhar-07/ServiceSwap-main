// Ambient declarations for Socket.IO client loaded via CDN
// Provides a minimal Socket type to avoid using 'any' in the app
export {};

declare global {
  interface Socket {
    on(event: string, cb: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
    disconnect(): void;
  }

  interface Window {
    io: (url: string, opts?: { auth?: { token?: string }; transports?: string[] }) => Socket;
  }
}