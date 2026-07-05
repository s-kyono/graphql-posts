import {
  Injectable,
  OnModuleInit,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@libsql/client';
import { mkdir } from 'node:fs/promises';
import type {
  User as GraphqlUser,
  UserProfile as GraphqlUserProfile,
} from '../generated/graphql-types';

export interface UserEntity {
  id?: number;
  uuid: GraphqlUser['userId'];
  email: GraphqlUser['email'];
  name: GraphqlUser['name'];
  createdAt?: string;
}

export interface ProfileEntity {
  id?: number;
  userUuid: string;
  bio: GraphqlUserProfile['bio'];
  avatarUrl: GraphqlUserProfile['avatarUrl'];
  avatarColors: GraphqlUserProfile['avatarColors'];
}

export interface AuthEntity {
  id?: number;
  userUuid: string;
  authType: string;
  authSecret: string;
}

export interface SessionEntity {
  id?: number;
  sessionToken: string;
  userUuid: string;
  expiresAt: string;
}

let db: ReturnType<typeof createClient> | undefined;

const AVATAR_COLOR_PALETTES = [
  ['#36C5F0', '#2EB67D', '#ECB22E'],
  ['#E01E5A', '#611F69', '#36C5F0'],
  ['#2EB67D', '#ECB22E', '#E01E5A'],
  ['#FF8A00', '#E01E5A', '#611F69'],
  ['#36C5F0', '#4A154B', '#ECB22E'],
  ['#7C3AED', '#06B6D4', '#84CC16'],
  ['#F97316', '#EC4899', '#8B5CF6'],
  ['#10B981', '#3B82F6', '#F59E0B'],
] as const;

const DEFAULT_AVATAR_COLORS = AVATAR_COLOR_PALETTES[0];

const createAvatarColors = (seed: string): string[] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return [...AVATAR_COLOR_PALETTES[hash % AVATAR_COLOR_PALETTES.length]];
};

const parseAvatarColors = (value: unknown): string[] => {
  if (typeof value !== 'string') return [...DEFAULT_AVATAR_COLORS];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length >= 3 &&
      parsed.every((color) => typeof color === 'string')
    ) {
      return parsed.slice(0, 3);
    }
  } catch {
    return [...DEFAULT_AVATAR_COLORS];
  }
  return [...DEFAULT_AVATAR_COLORS];
};

const getDb = (): ReturnType<typeof createClient> => {
  if (!db) {
    throw new Error('Database client is not initialized.');
  }

  return db;
};

export const userRepository = {
  // ユーザーデータを全件取得
  findAll: async (): Promise<UserEntity[]> => {
    const result = await getDb().execute('SELECT * FROM users ORDER BY id ASC');

    return result.rows.map((row) => ({
      id: Number(row.id),
      uuid: row.uuid as string,
      email: row.email as string,
      name: row.name as string,
      createdAt: row.create_at as string,
    }));
  },

  findByEmailOrUuid: async (identity: string): Promise<UserEntity | null> => {
    const result = await getDb().execute({
      sql: 'SELECT * FROM users WHERE email = ? OR uuid = ?',
      args: [identity, identity],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      uuid: row.uuid as string,
      email: row.email as string,
      name: row.name as string,
    };
  },

  save: async (user: UserEntity): Promise<UserEntity> => {
    const insertResult = await getDb().execute({
      sql: 'INSERT INTO users(uuid, email, name) VALUES (?, ?, ?)',
      args: [user.uuid, user.email, user.name],
    });

    const lastID = Number(insertResult.lastInsertRowid);
    const result = await getDb().execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [lastID],
    });

    const row = result.rows[0];

    return {
      id: Number(row.id),
      uuid: row.uuid as string,
      email: row.email as string,
      name: row.name as string,
    };
  },

  findProfileByUserUuid: async (
    userUuid: string
  ): Promise<ProfileEntity | null> => {
    console.log(
      `[DB Raw SQL] user_profiles を検索中... user_uuid=[${userUuid}]`
    );

    const result = await getDb().execute({
      sql: 'SELECT * FROM user_profiles WHERE user_uuid = ?',
      args: [userUuid],
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      userUuid: row.user_uuid as string,
      bio: row.bio as string,
      avatarUrl: row.avatar_url as string,
      avatarColors: parseAvatarColors(row.avatar_colors),
    };
  },

  findProfilesByUserUuid: async (
    userUuids: string[]
  ): Promise<ProfileEntity[]> => {
    console.log(
      `[DB Raw SQL] 【バッチ処理発動】一括で user_profilesを検索中...件数=[${userUuids.length}]`
    );

    const placeholders = userUuids.map(() => '?').join(',');

    const result = await getDb().execute({
      sql: `SELECT * FROM user_profiles WHERE user_uuid IN (${placeholders})`,
      args: userUuids,
    });

    return result.rows.map((row) => ({
      id: Number(row.id),
      userUuid: row.user_uuid as string,
      bio: row.bio as string,
      avatarUrl: row.avatar_url as string,
      avatarColors: parseAvatarColors(row.avatar_colors),
    }));
  },

  saveProfile: async (profile: ProfileEntity): Promise<void> => {
    await getDb().execute({
      sql: 'INSERT INTO user_profiles (user_uuid, bio, avatar_url, avatar_colors) VALUES(?,?,?,?)',
      args: [
        profile.userUuid,
        profile.bio,
        profile.avatarUrl,
        JSON.stringify(profile.avatarColors),
      ],
    });
  },
};

export const authRepository = {
  findByUserUuid: async (userUuid: string): Promise<AuthEntity | null> => {
    const result = await getDb().execute({
      sql: "SELECT * FROM auth WHERE user_uuid = ? AND auth_type = 'password'",
      args: [userUuid],
    });

    const row = result.rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      userUuid: row.user_uuid as string,
      authType: row.auth_type as string,
      authSecret: row.auth_secret as string,
    };
  },

  save: async (auth: AuthEntity): Promise<void> => {
    await getDb().execute({
      sql: 'INSERT INTO auth (user_uuid, auth_type, auth_secret) VALUES(?,?,?)',
      args: [auth.userUuid, auth.authType, auth.authSecret],
    });
  },
};

export const sessionRepository = {
  create: async (userUuid: string): Promise<SessionEntity> => {
    const token = uuidv4();
    await getDb().execute({
      sql: "INSERT INTO sessions(session_token, user_uuid, expires_at) VALUES(?, ?, datetime('now', '+1 day'))",
      args: [token, userUuid],
    });

    const result = await getDb().execute({
      sql: 'SELECT * FROM sessions WHERE session_token = ?',
      args: [token],
    });

    const row = result.rows[0];
    return {
      id: Number(row.id),
      sessionToken: row.session_token as string,
      userUuid: row.user_uuid as string,
      expiresAt: row.expires_at as string,
    };
  },

  findUserByToken: async (sessionToken: string): Promise<UserEntity | null> => {
    const result = await getDb().execute({
      sql: `
        SELECT users.*
        FROM sessions
        INNER JOIN users ON users.uuid = sessions.user_uuid
        WHERE sessions.session_token = ?
          AND datetime(sessions.expires_at) > datetime('now')
      `,
      args: [sessionToken],
    });

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      uuid: row.uuid as string,
      email: row.email as string,
      name: row.name as string,
      createdAt: row.create_at as string,
    };
  },

  deleteByToken: async (sessionToken: string): Promise<void> => {
    await getDb().execute({
      sql: 'DELETE FROM sessions WHERE session_token = ?',
      args: [sessionToken],
    });
  },
};

export const createUserUseCase = async (
  email: string,
  password: string,
): Promise<{
  userId: string;
  email: string;
  message: string;
}> => {
  if (!password || password.length < 8) {
    throw new BadRequestException('パスワードは8文字以上にしてください。');
  }

  const existingUser = await userRepository.findByEmailOrUuid(email);

  if (existingUser) {
    throw new ConflictException('このメールアドレスは既に登録されています。');
  }

  const passwordHash = await bcryptjs.hash(password, 10);
  const userUuid = uuidv4();

  const saveUser = await userRepository.save({
    uuid: userUuid,
    email: email,
    name: `User_${userUuid.slice(0, 8)}`,
  });

  await authRepository.save({
    userUuid: saveUser.uuid,
    authType: 'password',
    authSecret: passwordHash,
  });

  await userRepository.saveProfile({
    userUuid: saveUser.uuid,
    bio: `こんにちは！${email}のプロフィールです。生SQL最高!!`,
    avatarUrl: '',
    avatarColors: createAvatarColors(saveUser.uuid),
  });

  return {
    userId: saveUser.uuid,
    email: saveUser.email,
    message: 'User, Auth, and Profile created successfully!',
  };
};

export const loginUseCase = async (
  identity: string,
  passwordPlain: string
): Promise<{
  userId: string;
  email: string;
  message: string;
  sessionToken: string;
}> => {
  const user = await userRepository.findByEmailOrUuid(identity);

  if (!user) {
    throw new ConflictException(
      'ログイン情報またはパスワードが正しくありません。'
    );
  }
  const auth = await authRepository.findByUserUuid(user.uuid);

  if (auth == null) {
    throw new ConflictException(
      'ログイン情報またはパスワードが正しくありません。'
    );
  }

  const isMatch = await bcryptjs.compare(passwordPlain, auth.authSecret);

  if (!isMatch) {
    throw new ConflictException(
      'ログイン情報またはパスワードが正しくありません。'
    );
  }

  const session = await sessionRepository.create(user.uuid);
  return {
    userId: user.uuid,
    email: user.email,
    message: 'Login successful!',
    sessionToken: session.sessionToken,
  };
};

export const getSessionUserUseCase = async (sessionToken?: string) => {
  if (!sessionToken) return null;
  return await sessionRepository.findUserByToken(sessionToken);
};

export const logoutUseCase = async (sessionToken?: string) => {
  if (sessionToken) {
    await sessionRepository.deleteByToken(sessionToken);
  }

  return {
    success: true,
    message: 'Logout successful!',
  };
};

export const getUserUseCase = async () => {
  return await userRepository.findAll();
};

export const getProfileUseCase = async (userUuid: string) => {
  return await userRepository.findProfileByUserUuid(userUuid);
};

export const getProfilesByUserUuidUseCase = async (userUuids: string[]) => {
  return await userRepository.findProfilesByUserUuid(userUuids);
};

@Injectable()
export class AppService implements OnModuleInit {
  async onModuleInit() {
    await mkdir('database', { recursive: true });

    db = createClient({ url: 'file:./database/app.db' });

    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uuid TEXT NOT NULL UNIQUE,
        bio TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        avatar_colors TEXT NOT NULL DEFAULT '["#36C5F0","#2EB67D","#ECB22E"]',
        create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `);

    try {
      await getDb().execute(
        `ALTER TABLE user_profiles ADD COLUMN avatar_colors TEXT NOT NULL DEFAULT '["#36C5F0","#2EB67D","#ECB22E"]'`
      );
    } catch {
      // Existing databases already have this column.
    }

    const profilesWithoutStoredColors = await getDb().execute({
      sql: 'SELECT user_uuid FROM user_profiles WHERE avatar_colors = ?',
      args: [JSON.stringify(DEFAULT_AVATAR_COLORS)],
    });
    for (const row of profilesWithoutStoredColors.rows) {
      const userUuid = row.user_uuid as string;
      await getDb().execute({
        sql: 'UPDATE user_profiles SET avatar_colors = ? WHERE user_uuid = ?',
        args: [JSON.stringify(createAvatarColors(userUuid)), userUuid],
      });
    }
    await getDb().execute({
      sql: "UPDATE user_profiles SET avatar_url = '' WHERE avatar_url LIKE 'https://avatar.example.com/%'",
      args: [],
    });

    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uuid TEXT NOT NULL,
        auth_type TEXT NOT NULL,
        auth_secret TEXT NOT NULL,
        create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_uuid, auth_type),
        FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `);

    await getDb().execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_token TEXT NOT NULL UNIQUE,
        user_uuid TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        create_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
      )
    `);

    await getDb().execute(
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    );
    await getDb().execute(
      'CREATE INDEX IF NOT EXISTS idx_auth_user_uuid ON auth(user_uuid)'
    );
    await getDb().execute(
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_uuid ON sessions(user_uuid)'
    );
  }
}
