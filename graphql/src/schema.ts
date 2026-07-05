import Dataloader from "dataloader";
import { EventEmitter } from "events";
import { GraphQLError } from "graphql";
import {
  loginSchema,
  createUserSchema,
  createPostSchema,
  createBoardSchema,
  loginResponseSchema,
  createUserResponseSchema,
  userListItemSchema,
  currentUserSchema,
  userProfileSchema,
  postSchema,
  boardSchema,
  userProfileBulkItemSchema,
  type LoginResponseData,
  type CreateUserResponseData,
  type UserListItemData,
  type UserProfileData,
  type PostData,
  type BoardData,
} from "../shared/schemas/index.js";
import { builder } from "./builder.js";

export const USE_DATALOADER = true;
const BACKEND_URL = process.env.HTTP_BACKEND_URL ?? "http://nginx/api";
const globalBus = new EventEmitter();
globalBus.setMaxListeners(0);

const forwardSetCookies = (
  response: Response,
  context: {
    response?: { setHeader: (name: string, value: string | string[]) => void };
  }
) => {
  const headers = response.headers as
    | (Headers & { getSetCookie?: () => string[] })
    | undefined;
  const setCookies =
    headers?.getSetCookie?.() ??
    [headers?.get("set-cookie")].filter((cookie): cookie is string =>
      Boolean(cookie)
    );
  if (setCookies.length > 0) {
    context.response?.setHeader("Set-Cookie", setCookies);
  }
};

// ─── Output type shapes ────────────────────────────────────────────────────

type UserShape = UserListItemData & { message?: string | null };

// ─── GraphQL object types ──────────────────────────────────────────────────

const LoginResponseRef = builder.objectRef<LoginResponseData>("LoginResponse");
builder.objectType(LoginResponseRef, {
  fields: (t) => ({
    userId: t.exposeString("userId"),
    email: t.exposeString("email"),
    message: t.exposeString("message"),
  }),
});

const CreateUserResponseRef =
  builder.objectRef<CreateUserResponseData>("CreateUserResponse");
builder.objectType(CreateUserResponseRef, {
  fields: (t) => ({
    userId: t.exposeString("userId"),
    email: t.exposeString("email"),
    message: t.exposeString("message"),
  }),
});

const UserProfileRef = builder.objectRef<UserProfileData>("UserProfile");
builder.objectType(UserProfileRef, {
  fields: (t) => ({
    bio: t.exposeString("bio"),
    avatarUrl: t.exposeString("avatarUrl"),
    avatarColors: t.exposeStringList("avatarColors"),
  }),
});

const UserRef = builder.objectRef<UserShape>("User");
builder.objectType(UserRef, {
  fields: (t) => ({
    userId: t.exposeString("userId"),
    email: t.exposeString("email"),
    message: t.exposeString("message", { nullable: true }),
    name: t.exposeString("name"),
    profile: t.field({
      type: UserProfileRef,
      nullable: true,
      resolve: async (parent, _args, context) => {
        if (USE_DATALOADER) {
          console.log(
            `[🔍 User.profile] DataLoaderを使用してユーザープロフィールを取得中... userId: ${parent.userId}`
          );
          return context.profilesLoader.load(parent.userId);
        }
        console.log(
          `[🔍 User.profile] DataLoaderを使用せずにユーザープロフィールを直接取得中... userId: ${parent.userId}`
        );
        const response = await fetch(
          `${BACKEND_URL}/users/${parent.userId}/profiles`
        );
        return userProfileSchema.parse(await response.json());
      },
    }),
  }),
});

const BoardRef = builder.objectRef<BoardData>("Board");
builder.objectType(BoardRef, {
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    description: t.exposeString("description", { nullable: true }),
    createdAt: t.exposeString("createdAt"),
  }),
});

const PostRef = builder.objectRef<PostData>("Post");
builder.objectType(PostRef, {
  fields: (t) => ({
    id: t.exposeID("id"),
    parentId: t.exposeID("parentId", { nullable: true }),
    threadId: t.exposeString("threadId"),
    userId: t.exposeString("userId"),
    title: t.exposeString("title", { nullable: true }),
    userName: t.exposeString("userName", { nullable: true }),
    content: t.exposeString("content", { nullable: true }),
    createdAt: t.exposeString("createdAt"),
  }),
});

// ─── Query ─────────────────────────────────────────────────────────────────

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      resolve: () => "Hello GraphQL!",
    }),

    login: t.field({
      type: LoginResponseRef,
      nullable: true,
      args: {
        email: t.arg.string(),
        userId: t.arg.string(),
        password: t.arg.string(),
      },
      resolve: async (_, args, context) => {
        const parsed = loginSchema.safeParse(args);
        if (!parsed.success) {
          throw new GraphQLError(
            parsed.error.errors[0]?.message ?? "バリデーションエラー",
            { extensions: { code: "BAD_USER_INPUT", status: 400 } }
          );
        }
        const { email, userId, password } = parsed.data;
        const identifier = email || userId;
        const response = await fetch(`${BACKEND_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const json = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new GraphQLError(json.message || "ログインに失敗しました。", {
            extensions: { code: "BACKEND_ERROR", status: response.status },
          });
        }
        forwardSetCookies(response, context);
        return loginResponseSchema.parse(json);
      },
    }),

    me: t.field({
      type: UserRef,
      nullable: true,
      resolve: async (_, _args, context) => {
        const response = await fetch(`${BACKEND_URL}/me`, {
          headers: context.cookie ? { Cookie: context.cookie } : {},
        });
        if (!response.ok) {
          throw new GraphQLError("セッション確認に失敗しました。", {
            extensions: { code: "BACKEND_ERROR", status: response.status },
          });
        }
        return currentUserSchema.parse(await response.json());
      },
    }),

    getUsers: t.field({
      type: [UserRef],
      resolve: async () => {
        console.log(
          "[🌒 Graphql BFF] 👤 全ユーザー一覧の取得要求（親クエリ発動）"
        );
        const response = await fetch(`${BACKEND_URL}/users`);
        const raw = (await response.json()) as Array<Record<string, unknown>>;
        return userListItemSchema
          .array()
          .parse(raw.map((u) => ({ ...u, userId: u.userId ?? u.uuid })));
      },
    }),

    getBoards: t.field({
      type: [BoardRef],
      resolve: async () => {
        console.log(`[🌒 Graphql BFF] 📋 NestJSへ板一覧を問い合わせ中...`);
        const response = await fetch(`${BACKEND_URL}/boards`);
        return boardSchema.array().parse(await response.json());
      },
    }),

    getThreads: t.field({
      type: [PostRef],
      args: {
        threadId: t.arg.string({ required: true }),
      },
      resolve: async (_, { threadId }) => {
        console.log(
          `[🌒 Graphql BFF] 🕊️ NestJSへ過去ログを問い合わせ中... threadId: ${threadId}`
        );
        const response = await fetch(
          `${BACKEND_URL}/posts/threads/${threadId}`
        );
        return postSchema.array().parse(await response.json());
      },
    }),

    getRecentPosts: t.field({
      type: [PostRef],
      args: {
        limit: t.arg.int(),
      },
      resolve: async (_, { limit }) => {
        const n = limit ?? 100;
        console.log(`[🌒 Graphql BFF] 🔥 最新${n}件の投稿を取得中...`);
        const response = await fetch(`${BACKEND_URL}/posts/recent?limit=${n}`);
        return postSchema.array().parse(await response.json());
      },
    }),
  }),
});

// ─── Mutation ──────────────────────────────────────────────────────────────

builder.mutationType({
  fields: (t) => ({
    logout: t.boolean({
      resolve: async (_parent, _args, context) => {
        const response = await fetch(`${BACKEND_URL}/logout`, {
          method: "POST",
          headers: context.cookie ? { Cookie: context.cookie } : {},
        });
        const json = (await response.json()) as {
          message?: string;
          success?: boolean;
        };
        if (!response.ok) {
          throw new GraphQLError(json.message || "ログアウトに失敗しました。", {
            extensions: { code: "BACKEND_ERROR", status: response.status },
          });
        }
        forwardSetCookies(response, context);
        return json.success ?? true;
      },
    }),

    createUser: t.field({
      type: CreateUserResponseRef,
      args: {
        email: t.arg.string({ required: true }),
        password: t.arg.string({ required: true }),
      },
      resolve: async (_, args) => {
        const parsed = createUserSchema.safeParse(args);
        if (!parsed.success) {
          throw new GraphQLError(
            parsed.error.errors[0]?.message ?? "バリデーションエラー",
            { extensions: { code: "BAD_USER_INPUT", status: 400 } }
          );
        }
        const { email, password } = parsed.data;
        const response = await fetch(`${BACKEND_URL}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = createUserResponseSchema.parse(await response.json());
        globalBus.emit("USER_CREATED", { userCreated: data });
        return data;
      },
    }),

    createBoard: t.field({
      type: BoardRef,
      args: {
        name: t.arg.string({ required: true }),
        description: t.arg.string(),
      },
      resolve: async (_, args) => {
        const parsed = createBoardSchema.safeParse(args);
        if (!parsed.success) {
          throw new GraphQLError(
            parsed.error.errors[0]?.message ?? "バリデーションエラー",
            { extensions: { code: "BAD_USER_INPUT", status: 400 } }
          );
        }
        const { name, description } = parsed.data;
        const response = await fetch(`${BACKEND_URL}/boards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        if (!response.ok) {
          const json = (await response.json()) as { message?: string };
          throw new GraphQLError(json.message || "板の作成に失敗しました。", {
            extensions: { code: "BACKEND_ERROR", status: response.status },
          });
        }
        return boardSchema.parse(await response.json());
      },
    }),

    createPost: t.field({
      type: PostRef,
      args: {
        parentId: t.arg.id(),
        threadId: t.arg.string({ required: true }),
        userId: t.arg.string({ required: true }),
        title: t.arg.string(),
        userName: t.arg.string(),
        content: t.arg.string(),
      },
      resolve: async (_, args) => {
        const parsed = createPostSchema.safeParse(args);
        if (!parsed.success) {
          throw new GraphQLError(
            parsed.error.errors[0]?.message ?? "バリデーションエラー",
            { extensions: { code: "BAD_USER_INPUT", status: 400 } }
          );
        }
        const { parentId, threadId, userId, title, userName, content } =
          parsed.data;
        const response = await fetch(`${BACKEND_URL}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId,
            threadId,
            userId,
            title,
            userName,
            content,
          }),
        });
        if (!response.ok) {
          throw new GraphQLError("投稿の作成に失敗しました。", {
            extensions: { code: "BACKEND_ERROR", status: response.status },
          });
        }
        const savedPost = postSchema.parse(await response.json());
        console.log(
          `[🌒 Graphql BFF] 🕊️ NestJSへ新規投稿を保存完了！ threadId: ${threadId} postId: ${savedPost.id}`
        );
        globalBus.emit(`NEW_POST_${savedPost.threadId}`, {
          onNewPost: savedPost,
        });
        return savedPost;
      },
    }),
  }),
});

// ─── Subscription ──────────────────────────────────────────────────────────

const viewerCounts = new Map<string, number>();

builder.subscriptionType({
  fields: (t) => ({
    userCreated: t.field({
      type: CreateUserResponseRef,
      subscribe: () => createAsyncIterator("USER_CREATED"),
      resolve: (event: any) => event.userCreated,
    }),

    onNewPost: t.field({
      type: PostRef,
      args: {
        threadId: t.arg.string({ required: true }),
      },
      subscribe: (_, args) => {
        console.log(
          `[🌒 Graphql BFF] 🕊️ 新規投稿のサブスクリプションが開始されました！ threadId: ${args.threadId}`
        );
        return createAsyncIterator(`NEW_POST_${args.threadId}`);
      },
      resolve: (event: any) => event.onNewPost,
    }),

    threadViewerCount: t.field({
      type: "Int",
      args: {
        threadId: t.arg.string({ required: true }),
      },
      subscribe: (_, args) => {
        console.log(
          `[🌒 Graphql BFF] 👁️ 閲覧者カウントのサブスクリプションが開始されました！ threadId: ${args.threadId}`
        );
        return createViewerCountIterator(args.threadId);
      },
      resolve: (event: any) => event,
    }),
  }),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

export const createProfilesLoader = () => {
  return new Dataloader<string, any>(async (userUUIds: readonly string[]) => {
    console.log(
      `[🧙DataLoader発動]🌀保留していたIDを全回収して裏へ一撃！ 件数=${userUUIds.length}`
    );
    const response = await fetch(`${BACKEND_URL}/users/profiles/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: userUUIds }),
    });
    const profiles = userProfileBulkItemSchema
      .array()
      .parse(await response.json());
    const profilesMap = new Map(
      profiles.map((profile) => [profile.userId ?? profile.userUuid, profile])
    );
    return userUUIds.map((userId) => profilesMap.get(userId));
  });
};

const createViewerCountIterator = async (threadId: string): Promise<AsyncIterable<any>> => {
  const key = `VIEWER_COUNT_${threadId}`;
  const newCount = (viewerCounts.get(threadId) ?? 0) + 1;
  viewerCounts.set(threadId, newCount);
  globalBus.emit(key, newCount);

  return {
    [Symbol.asyncIterator]() {
      const queue: any[] = [newCount];
      let resolver: ((value: IteratorResult<any>) => void) | null = null;

      const listen = (data: any) => {
        if (resolver) {
          resolver({ value: data, done: false });
          resolver = null;
        } else {
          queue.push(data);
        }
      };

      globalBus.on(key, listen);

      return {
        async next(): Promise<IteratorResult<any>> {
          if (queue.length > 0) {
            return { value: queue.shift(), done: false };
          }
          return new Promise((resolve) => {
            resolver = resolve;
          });
        },
        async return(): Promise<IteratorResult<any>> {
          globalBus.off(key, listen);
          const decremented = Math.max(0, (viewerCounts.get(threadId) ?? 1) - 1);
          viewerCounts.set(threadId, decremented);
          globalBus.emit(key, decremented);
          return { value: undefined, done: true };
        },
      };
    },
  };
};

const createAsyncIterator = async (
  eventName: string
): Promise<AsyncIterable<any>> => {
  return {
    [Symbol.asyncIterator]() {
      const queue: any[] = [];
      let resolver: ((value: IteratorResult<any>) => void) | null = null;

      const listen = (data: any) => {
        if (resolver) {
          resolver({ value: data, done: false });
          resolver = null;
        } else {
          queue.push(data);
        }
      };

      globalBus.on(eventName, listen);

      return {
        async next(): Promise<IteratorResult<any>> {
          if (queue.length > 0) {
            return { value: queue.shift(), done: false };
          }
          return new Promise((resolve) => {
            resolver = resolve;
          });
        },
        async return(): Promise<IteratorResult<any>> {
          globalBus.off(eventName, listen);
          return { value: undefined, done: true };
        },
      };
    },
  };
};

export const createSchema = () => builder.toSchema();
