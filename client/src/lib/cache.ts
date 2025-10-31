interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

const CACHE_PREFIX = 'studyconnect_';

export class LocalCache {
  static set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: expiresInMs,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();
      
      if (now - item.timestamp > item.expiresIn) {
        this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to read cache:', error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove cache:', error);
    }
  }

  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  static has(key: string): boolean {
    const cached = this.get(key);
    return cached !== null;
  }
}

export const CacheKeys = {
  USER: (userId: string) => `user_${userId}`,
  PROFILE: (userId: string) => `profile_${userId}`,
  ROOMS: 'public_rooms',
  FRIENDS: (userId: string) => `friends_${userId}`,
  MESSAGES: (userId1: string, userId2: string) => `messages_${[userId1, userId2].sort().join('_')}`,
} as const;
