declare module '@heygen/liveavatar-web-sdk' {
  export interface LiveAvatarSessionOptions {
    autoKeepAlive?: boolean
    voiceChat?: {
      defaultMuted?: boolean
    }
  }

  export class LiveAvatarSession {
    constructor(sessionUrl: string, options?: LiveAvatarSessionOptions)
    start(): Promise<void>
    stop(): Promise<void>
  }
}
