import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'node:fs/promises';

type PostRow = {
  id: unknown;
  parent_id: unknown;
  thread_id: unknown;
  user_id: unknown;
  title: unknown;
  user_name: unknown;
  content: unknown;
  create_at: unknown;
};

const toPostResponse = (row: PostRow) => ({
  id: row.id as string,
  parentId: row.parent_id as string | null,
  threadId: row.thread_id as string,
  userId: row.user_id as string,
  title: row.title as string | null,
  userName: row.user_name as string | null,
  content: row.content as string | null,
  createdAt: row.create_at as string,
});

@Injectable()
export class PostsService implements OnModuleInit {
  private db: Client;

  async onModuleInit() {
    await mkdir('database', { recursive: true });

    this.db = createClient({
      url: 'file:./database/app.db',
    });

    console.log(
      `LibSQL(SQLite)データベースが開通しました!! パス: file:./database/app.db`,
    );

    await this.db.execute(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          parent_id TEXT NULL,
          thread_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NULL,
          user_name TEXT DEFAULT '名無しさん',
          content TEXT NULL,
          create_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE
        );
    `);
    console.log(`posts テーブルの生存（初期化）を確認しました！`);
  }

  async createPost(data: {
    parentId: string | null;
    threadId: string | null;
    userId: string | null;
    title: string | null;
    userName: string | null;
    content: string | null;
  }) {
    const id = `post_${uuidv4()}`;

    const parentId = data.parentId ?? null;
    const title = data.title ?? null;
    const content = data.content ?? null;
    const userName = data.userName ?? null;

    await this.db.execute({
      sql: `INSERT INTO posts (id, parent_id, thread_id, user_id, title, user_name, content)
            VALUES(?,?,?,?,?,?,?)`,
      args: [
        id,
        parentId,
        data.threadId,
        data.userId,
        title,
        userName,
        content,
      ],
    });

    return this.getPostById(id);
  }

  async getPostsByThread(threadId: string) {
    const result = await this.db.execute({
      sql: `SELECT * FROM posts WHERE thread_id = ? ORDER BY create_at ASC`,
      args: [threadId],
    });

    return result.rows.map((row) => toPostResponse(row as unknown as PostRow));
  }

  async getRecentPosts(limit: number) {
    const result = await this.db.execute({
      sql: `SELECT * FROM posts ORDER BY create_at DESC LIMIT ?`,
      args: [limit],
    });
    return result.rows.map((row) => toPostResponse(row as unknown as PostRow));
  }

  private async getPostById(id: string) {
    const result = await this.db.execute({
      sql: 'SELECT * FROM posts WHERE id = ?',
      args: [id],
    });
    const row = result.rows[0];
    return row ? toPostResponse(row as unknown as PostRow) : null;
  }
}
