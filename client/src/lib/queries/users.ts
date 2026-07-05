import type { User } from "@graphql-posts/graphql-types";
import { ClientError } from "graphql-request";
import { gqlClient } from "@/lib/graphql-client";

const GET_USERS_QUERY = `
  query GetUsers {
    getUsers {
      userId
      email
      name
      profile {
        avatarUrl
        avatarColors
        bio
      }
    }
  }
`;

type GetUsersResult = { getUsers: User[] };

export async function getUsersQuery(): Promise<User[]> {
  try {
    const data = await gqlClient.request<GetUsersResult>(GET_USERS_QUERY);
    return data.getUsers;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "ユーザー取得に失敗しました");
    }
    throw e;
  }
}
