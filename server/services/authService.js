import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { openSearchService } from './openSearchEngine.js';

const scrypt = promisify(scryptCallback);
const USERS_INDEX = 'trustrank_users';
const SESSIONS_INDEX = 'trustrank_sessions';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let indexesReady;

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = (async () => {
      await openSearchService.init();
      for (const [index, properties] of [
        [USERS_INDEX, { id: { type: 'keyword' }, email: { type: 'keyword' }, name: { type: 'keyword' }, passwordSalt: { type: 'keyword' }, passwordHash: { type: 'keyword' }, createdAt: { type: 'date' } }],
        [SESSIONS_INDEX, { userId: { type: 'keyword' }, userDocId: { type: 'keyword' }, expiresAt: { type: 'date' } }],
      ]) {
        const exists = await openSearchService.client.indices.exists({ index });
        if (!exists.body) {
          try {
            await openSearchService.client.indices.create({ index, body: { mappings: { properties } } });
          } catch (error) {
            const type = error.meta?.body?.error?.type || error.body?.error?.type;
            if (type !== 'resource_already_exists_exception') throw error;
          }
        }
      }
    })().catch((error) => {
      indexesReady = null;
      throw error;
    });
  }
  return indexesReady;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function isConflict(error) {
  return error.statusCode === 409 || error.meta?.statusCode === 409;
}

export class AuthService {
  async register({ name, email, password }) {
    await ensureIndexes();
    const emailKey = digest(email);
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    const user = {
      id: `user-${randomUUID()}`,
      name,
      email,
      passwordSalt: salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    try {
      await openSearchService.client.create({ index: USERS_INDEX, id: emailKey, body: user, refresh: true });
    } catch (error) {
      if (isConflict(error)) return null;
      throw error;
    }
    return publicUser(user);
  }

  async authenticate(email, password) {
    await ensureIndexes();
    let user;
    try {
      const response = await openSearchService.client.get({ index: USERS_INDEX, id: digest(email) });
      user = response.body._source;
    } catch (error) {
      if (error.statusCode === 404 || error.meta?.statusCode === 404) return null;
      throw error;
    }
    const actual = Buffer.from(await scrypt(password, user.passwordSalt, 64));
    const expected = Buffer.from(user.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return publicUser(user);
  }

  async createSession(user) {
    await ensureIndexes();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    await openSearchService.client.create({
      index: SESSIONS_INDEX,
      id: digest(token),
      body: { userId: user.id, userDocId: digest(user.email), expiresAt: new Date(expiresAt).toISOString() },
      refresh: true,
    });
    return { token, expiresAt };
  }

  async getSession(token) {
    if (!token) return null;
    await ensureIndexes();
    try {
      const response = await openSearchService.client.get({ index: SESSIONS_INDEX, id: digest(token) });
      const session = response.body._source;
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        await this.deleteSession(token);
        return null;
      }
      const userResponse = await openSearchService.client.get({ index: USERS_INDEX, id: session.userDocId });
      return publicUser(userResponse.body._source);
    } catch (error) {
      if (error.statusCode === 404 || error.meta?.statusCode === 404) return null;
      throw error;
    }
  }

  async deleteSession(token) {
    if (!token) return;
    await ensureIndexes();
    try {
      await openSearchService.client.delete({ index: SESSIONS_INDEX, id: digest(token), refresh: true });
    } catch (error) {
      if (error.statusCode !== 404 && error.meta?.statusCode !== 404) throw error;
    }
  }
}

export const authService = new AuthService();
export { SESSION_TTL_MS };
export default authService;
