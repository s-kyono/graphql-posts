import { Body, Controller, Get, Post } from '@nestjs/common';
import { BoardsService } from './boards.service';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  async getAll() {
    console.log(`[NestJS app] 板一覧取得(LibSQL)`);
    return await this.boardsService.getBoards();
  }

  @Post()
  async create(@Body() body: any) {
    console.log(`[NestJS app] 新しい板の作成要求(LibSQL): ${JSON.stringify(body)}`);
    return await this.boardsService.createBoard(body);
  }
}
