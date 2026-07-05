import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string()
      .email("有効なメールアドレスを入力してください")
      .optional(),
    userId: z.string().min(1).optional(),
    password: z
      .string({ required_error: "パスワードは必須です" })
      .min(1, "パスワードは必須です"),
  })
  .refine((data) => data.email || data.userId, {
    message: "メールアドレスまたはユーザーIDを入力してください",
  })
  .refine((data) => !(data.email && data.userId), {
    message: "同時に両方の入力はできません",
  });

export type LoginInput = z.infer<typeof loginSchema>;

// クライアントのログインフォーム（メールアドレス or ユーザーID + パスワード）
export const loginByEmailOrUserIdSchema = z.object({
  emailOrUserId: z
    .string()
    .min(1, "メールアドレスまたはユーザーIDを入力してください")
    .refine(
      (val) => !val.includes("@") || z.string().email().safeParse(val).success,
      "有効なメールアドレスを入力してください"
    ),
  password: z.string().min(1, "パスワードは必須です"),
});

export type LoginByEmailOrUserIdInput = z.infer<
  typeof loginByEmailOrUserIdSchema
>;

export const createUserSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上にしてください").optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createPostSchema = z.object({
  parentId: z.string().nullish(),
  threadId: z.string().min(1, "スレッドIDは必須です"),
  userId: z.string().min(1, "ユーザーIDは必須です"),
  title: z.string().optional(),
  userName: z.string().optional(),
  content: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ─── Response schemas (HTTP API レスポンスのバリデーション) ───────────────

export const loginResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  message: z.string(),
});
export type LoginResponseData = z.infer<typeof loginResponseSchema>;

export const createUserResponseSchema = z.object({
  userId: z.string(),
  password: z.string(),
  email: z.string(),
  message: z.string(),
});
export type CreateUserResponseData = z.infer<typeof createUserResponseSchema>;

export const userListItemSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
});
export type UserListItemData = z.infer<typeof userListItemSchema>;

export const currentUserSchema = userListItemSchema.nullable();
export type CurrentUserData = z.infer<typeof currentUserSchema>;

export const userProfileSchema = z.object({
  bio: z.string(),
  avatarUrl: z.string(),
  avatarColors: z
    .array(z.string())
    .length(3)
    .default(["#36C5F0", "#2EB67D", "#ECB22E"]),
});
export type UserProfileData = z.infer<typeof userProfileSchema>;

export const postSchema = z.object({
  id: z.string(),
  parentId: z.string().nullish(),
  threadId: z.string(),
  userId: z.string(),
  title: z.string().nullish(),
  userName: z.string().nullish(),
  content: z.string().nullish(),
  createdAt: z.string(),
});
export type PostData = z.infer<typeof postSchema>;

export const boardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  createdAt: z.string(),
});
export type BoardData = z.infer<typeof boardSchema>;

export const createBoardSchema = z.object({
  name: z.string().min(1, "板名は必須です"),
  description: z.string().optional(),
});
export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const userProfileBulkItemSchema = z.object({
  userId: z.string().optional(),
  userUuid: z.string().optional(),
  bio: z.string(),
  avatarUrl: z.string(),
  avatarColors: z
    .array(z.string())
    .length(3)
    .default(["#36C5F0", "#2EB67D", "#ECB22E"]),
});
export type UserProfileBulkItemData = z.infer<typeof userProfileBulkItemSchema>;
