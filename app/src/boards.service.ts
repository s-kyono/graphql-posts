import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, Client } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'node:fs/promises';

type BoardRow = {
  id: unknown;
  name: unknown;
  description: unknown;
  create_at: unknown;
};

const toBoardResponse = (row: BoardRow) => ({
  id: row.id as string,
  name: row.name as string,
  description: row.description as string | null,
  createdAt: row.create_at as string,
});

@Injectable()
export class BoardsService implements OnModuleInit {
  private db: Client;

  async onModuleInit() {
    await mkdir('database', { recursive: true });

    this.db = createClient({ url: 'file:./database/app.db' });

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NULL,
        create_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(`boards テーブルの生存（初期化）を確認しました！`);
  }

  async getBoards() {
    const result = await this.db.execute(
      `SELECT * FROM boards ORDER BY create_at ASC`,
    );
    return result.rows.map((row) => toBoardResponse(row as unknown as BoardRow));
  }

  async createBoard(data: { name: string; description?: string | null }) {
    const id = `board_${uuidv4()}`;

    await this.db.execute({
      sql: `INSERT INTO boards (id, name, description) VALUES (?, ?, ?)`,
      args: [id, data.name, data.description ?? null],
    });

    const result = await this.db.execute({
      sql: `SELECT * FROM boards WHERE id = ?`,
      args: [id],
    });
    return toBoardResponse(result.rows[0] as unknown as BoardRow);
  }
}
