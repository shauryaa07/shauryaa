import { Session } from "@shared/schema";

export interface IStorage {
  createSession(session: Omit<Session, "id">): Session;
  getSession(userId: string): Session | undefined;
  removeSession(userId: string): void;
  getAllSessions(): Session[];
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  createSession(sessionData: Omit<Session, "id">): Session {
    const session: Session = {
      ...sessionData,
      id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };
    this.sessions.set(sessionData.userId, session);
    return session;
  }

  getSession(userId: string): Session | undefined {
    return this.sessions.get(userId);
  }

  removeSession(userId: string): void {
    this.sessions.delete(userId);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}

export const storage = new MemStorage();
