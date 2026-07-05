import { Body, Controller, Get, Post, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@Body() body: any) {
    console.log(
      `[NestJS app] 新しい書き込み要求(LibSQL):${JSON.stringify(body)}`,
    );

    return await this.postsService.createPost(body);
  }

  @Get('recent')
  async getRecent(@Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit ?? '100', 10) || 100, 500);
    console.log(`[NestJS app] 最新${n}件の投稿を一括取得(LibSQL)`);
    return await this.postsService.getRecentPosts(n);
  }

  @Get('threads/:threadId')
  async getByThread(@Param('threadId') threadId: string) {
    console.log(`[NestJS app]  スレッド[${threadId}]のログ一括取得(LibSQL)`);

    return await this.postsService.getPostsByThread(threadId);
  }
}
