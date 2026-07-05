import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts.module';
import { BoardsModule } from './boards.module';

@Module({
  imports: [PostsModule, BoardsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
