import type {
  LoginResponse,
  QueryLoginArgs,
  User,
} from "@graphql-posts/graphql-types";
import { ClientError } from "graphql-request";
import { gqlClient } from "@/lib/graphql-client";

const LOGIN_QUERY = `
  query Login($email: String, $password: String, $userId: String) {
    login(email: $email, password: $password, userId: $userId) {
      userId
      email
      message
    }
  }
`;

const ME_QUERY = `
  query Me {
    me {
      userId
      email
      name
      profile {
        avatarUrl
        avatarColors
      }
    }
  }
`;

type LoginResult = { login: LoginResponse | null };
type MeResult = { me: User | null };
type LogoutResult = { logout: boolean };
type CreateUserResult = {
  createUser: {
    userId: string;
    email: string;
    password: string;
    message: string;
  };
};

const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`;

const CREATE_USER_MUTATION = `
  mutation CreateUser($email: String!, $password: String) {
    createUser(email: $email, password: $password) {
      userId
      email
      password
      message
    }
  }
`;

export async function loginQuery(args: QueryLoginArgs): Promise<LoginResponse> {
  try {
    const data = await gqlClient.request<LoginResult>(LOGIN_QUERY, args);
    if (!data.login)
      throw new Error(
        "メールアドレス・ユーザーID またはパスワードが正しくありません",
      );
    return data.login;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "ログインに失敗しました");
    }
    throw e;
  }
}

export async function getCurrentUserQuery(): Promise<User> {
  try {
    const data = await gqlClient.request<MeResult>(ME_QUERY);
    if (!data.me) throw new Error("セッションが確認できませんでした");
    return data.me;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "セッション確認に失敗しました");
    }
    throw e;
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const data = await gqlClient.request<MeResult>(ME_QUERY);
    return data.me;
  } catch {
    return null;
  }
}

export async function logoutMutation(): Promise<boolean> {
  try {
    const data = await gqlClient.request<LogoutResult>(LOGOUT_MUTATION);
    return data.logout;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "ログアウトに失敗しました");
    }
    throw e;
  }
}

export async function createUserMutation(
  email: string,
  password?: string,
): Promise<{
  userId: string;
  email: string;
  password: string;
  message: string;
}> {
  try {
    const data = await gqlClient.request<CreateUserResult>(
      CREATE_USER_MUTATION,
      { email, password },
    );
    return data.createUser;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "ユーザー登録に失敗しました");
    }
    throw e;
  }
}
