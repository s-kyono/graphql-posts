import { Body, Controller, Get, Headers, Post, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  AppService,
  createUserUseCase,
  getSessionUserUseCase,
  getProfilesByUserUuidUseCase,
  getProfileUseCase,
  getUserUseCase,
  loginUseCase,
  logoutUseCase,
} from './app.service';

const getSessionTokenFromCookie = (cookieHeader?: string) => {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('sessionToken='))
    ?.split('=')
    .slice(1)
    .join('=');
};

@Controller()
export class AppController {
  constructor(private readonly _: AppService) {}

  @Post('users')
  async createUser(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return await createUserUseCase(email, password);
  }

  @Post('login')
  async login(
    @Body('identifier') identifier: string,
    @Body('password') passwordPlain: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await loginUseCase(identifier, passwordPlain);
    response.cookie('sessionToken', result.sessionToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });

    return {
      userId: result.userId,
      email: result.email,
      message: result.message,
    };
  }

  @Post('logout')
  async logout(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await logoutUseCase(getSessionTokenFromCookie(cookieHeader));
    response.clearCookie('sessionToken', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });

    return result;
  }

  @Get('me')
  async me(@Headers('cookie') cookieHeader?: string) {
    const sessionToken = getSessionTokenFromCookie(cookieHeader);
    const user = await getSessionUserUseCase(sessionToken);
    if (!user) return null;

    return {
      userId: user.uuid,
      email: user.email,
      name: user.name,
    };
  }

  @Get('users')
  async getUsers() {
    return await getUserUseCase();
  }

  @Get('users/:uuid/profiles')
  async getProfile(@Param('uuid') uuid: string) {
    return await getProfileUseCase(uuid);
  }

  @Post('users/profiles/bulk')
  async getProfilesBulk(@Body('userIds') userUuids: string[]) {
    return await getProfilesByUserUuidUseCase(userUuids);
  }

  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}
