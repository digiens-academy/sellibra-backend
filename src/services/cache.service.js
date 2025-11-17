const { safeGet, safeSet, safeDel, safeExists } = require('../config/redis');
const logger = require('../utils/logger');

// TTL değerleri (saniye cinsinden)
const TTL = {
  USER: 300, // 5 dakika
  SESSION: 3600, // 1 saat
  PRINTNEST: 1800, // 30 dakika
  ETSY_STORE: 3600, // 1 saat
  RATE_LIMIT: 60, // 1 dakika
};

// Cache key oluşturucular
const KEYS = {
  user: (userId) => `user:${userId}`,
  session: (sessionId) => `session:${sessionId}`,
  userSessions: (userId) => `user:${userId}:sessions`,
  etsyStore: (storeId) => `etsy:store:${storeId}`,
  userEtsyStores: (userId) => `user:${userId}:etsy_stores`,
  tokenBlacklist: (token) => `token:blacklist:${token}`,
};

class CacheService {
  // ============ USER CACHE ============
  async getUserCache(userId) {
    try {
      const data = await safeGet(KEYS.user(userId));
      if (data) {
        logger.debug(`Cache HIT: User ${userId}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: User ${userId}`);
      return null;
    } catch (error) {
      logger.error('getUserCache error:', error);
      return null;
    }
  }

  async setUserCache(userId, userData, ttl = TTL.USER) {
    try {
      await safeSet(KEYS.user(userId), JSON.stringify(userData), ttl);
      logger.debug(`Cache SET: User ${userId}`);
      return true;
    } catch (error) {
      logger.error('setUserCache error:', error);
      return false;
    }
  }

  async deleteUserCache(userId) {
    try {
      await safeDel(KEYS.user(userId));
      logger.debug(`Cache DELETE: User ${userId}`);
      return true;
    } catch (error) {
      logger.error('deleteUserCache error:', error);
      return false;
    }
  }

  // ============ SESSION CACHE ============
  async getSessionCache(sessionId) {
    try {
      const data = await safeGet(KEYS.session(sessionId));
      if (data) {
        logger.debug(`Cache HIT: Session ${sessionId}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: Session ${sessionId}`);
      return null;
    } catch (error) {
      logger.error('getSessionCache error:', error);
      return null;
    }
  }

  async setSessionCache(sessionId, sessionData, ttl = TTL.SESSION) {
    try {
      await safeSet(KEYS.session(sessionId), JSON.stringify(sessionData), ttl);
      logger.debug(`Cache SET: Session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('setSessionCache error:', error);
      return false;
    }
  }

  async deleteSessionCache(sessionId) {
    try {
      await safeDel(KEYS.session(sessionId));
      logger.debug(`Cache DELETE: Session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('deleteSessionCache error:', error);
      return false;
    }
  }

  // ============ USER SESSIONS (PrintNest) ============
  async getUserSessionsCache(userId) {
    try {
      const data = await safeGet(KEYS.userSessions(userId));
      if (data) {
        logger.debug(`Cache HIT: User sessions ${userId}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: User sessions ${userId}`);
      return null;
    } catch (error) {
      logger.error('getUserSessionsCache error:', error);
      return null;
    }
  }

  async setUserSessionsCache(userId, sessionsData, ttl = TTL.PRINTNEST) {
    try {
      await safeSet(KEYS.userSessions(userId), JSON.stringify(sessionsData), ttl);
      logger.debug(`Cache SET: User sessions ${userId}`);
      return true;
    } catch (error) {
      logger.error('setUserSessionsCache error:', error);
      return false;
    }
  }

  async deleteUserSessionsCache(userId) {
    try {
      await safeDel(KEYS.userSessions(userId));
      logger.debug(`Cache DELETE: User sessions ${userId}`);
      return true;
    } catch (error) {
      logger.error('deleteUserSessionsCache error:', error);
      return false;
    }
  }

  // ============ ETSY STORE CACHE ============
  async getEtsyStoreCache(storeId) {
    try {
      const data = await safeGet(KEYS.etsyStore(storeId));
      if (data) {
        logger.debug(`Cache HIT: Etsy store ${storeId}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: Etsy store ${storeId}`);
      return null;
    } catch (error) {
      logger.error('getEtsyStoreCache error:', error);
      return null;
    }
  }

  async setEtsyStoreCache(storeId, storeData, ttl = TTL.ETSY_STORE) {
    try {
      await safeSet(KEYS.etsyStore(storeId), JSON.stringify(storeData), ttl);
      logger.debug(`Cache SET: Etsy store ${storeId}`);
      return true;
    } catch (error) {
      logger.error('setEtsyStoreCache error:', error);
      return false;
    }
  }

  async deleteEtsyStoreCache(storeId) {
    try {
      await safeDel(KEYS.etsyStore(storeId));
      logger.debug(`Cache DELETE: Etsy store ${storeId}`);
      return true;
    } catch (error) {
      logger.error('deleteEtsyStoreCache error:', error);
      return false;
    }
  }

  // ============ TOKEN BLACKLIST ============
  async isTokenBlacklisted(token) {
    try {
      return await safeExists(KEYS.tokenBlacklist(token));
    } catch (error) {
      logger.error('isTokenBlacklisted error:', error);
      return false;
    }
  }

  async addTokenToBlacklist(token, ttl = TTL.SESSION) {
    try {
      await safeSet(KEYS.tokenBlacklist(token), '1', ttl);
      logger.debug(`Token blacklisted`);
      return true;
    } catch (error) {
      logger.error('addTokenToBlacklist error:', error);
      return false;
    }
  }

  // ============ UTILITY METHODS ============
  async clearUserData(userId) {
    try {
      await this.deleteUserCache(userId);
      await this.deleteUserSessionsCache(userId);
      logger.info(`All cache cleared for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('clearUserData error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();

