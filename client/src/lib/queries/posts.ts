import type { Post, MutationCreatePostArgs, Board, MutationCreateBoardArgs } from "@graphql-posts/graphql-types";
import { ClientError } from "graphql-request";
import { gqlClient } from "@/lib/graphql-client";

const GET_BOARDS_QUERY = `
  query GetBoards {
    getBoards {
      id
      name
      description
      createdAt
    }
  }
`;

const CREATE_BOARD_MUTATION = `
  mutation CreateBoard($name: String!, $description: String) {
    createBoard(name: $name, description: $description) {
      id
      name
      description
      createdAt
    }
  }
`;

const GET_THREADS_QUERY = `
  query GetThreads($threadId: String!) {
    getThreads(threadId: $threadId) {
      id
      threadId
      parentId
      userId
      userName
      title
      content
      createdAt
    }
  }
`;

const CREATE_POST_MUTATION = `
  mutation CreatePost(
    $threadId: String!
    $userId: String!
    $userName: String
    $content: String
    $title: String
    $parentId: ID
  ) {
    createPost(
      threadId: $threadId
      userId: $userId
      userName: $userName
      content: $content
      title: $title
      parentId: $parentId
    ) {
      id
      threadId
      parentId
      userId
      userName
      title
      content
      createdAt
    }
  }
`;

export const ON_NEW_POST_SUBSCRIPTION = `
  subscription OnNewPost($threadId: String!) {
    onNewPost(threadId: $threadId) {
      id
      threadId
      parentId
      userId
      userName
      title
      content
      createdAt
    }
  }
`;

export const THREAD_VIEWER_COUNT_SUBSCRIPTION = `
  subscription ThreadViewerCount($threadId: String!) {
    threadViewerCount(threadId: $threadId)
  }
`;

const GET_RECENT_POSTS_QUERY = `
  query GetRecentPosts($limit: Int) {
    getRecentPosts(limit: $limit) {
      id
      threadId
      userId
      userName
      title
      content
      createdAt
    }
  }
`;

type GetBoardsResult = { getBoards: Board[] };
type CreateBoardResult = { createBoard: Board };
type GetThreadsResult = { getThreads: Post[] };
type GetRecentPostsResult = { getRecentPosts: Post[] };
type CreatePostResult = { createPost: Post };

export async function getBoardsQuery(): Promise<Board[]> {
  try {
    const data = await gqlClient.request<GetBoardsResult>(GET_BOARDS_QUERY);
    return data.getBoards;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "板一覧の取得に失敗しました");
    }
    throw e;
  }
}

export async function getRecentPostsQuery(limit = 100): Promise<Post[]> {
  try {
    const data = await gqlClient.request<GetRecentPostsResult>(GET_RECENT_POSTS_QUERY, { limit });
    return data.getRecentPosts;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "最新投稿の取得に失敗しました");
    }
    throw e;
  }
}

export async function createBoardMutation(args: MutationCreateBoardArgs): Promise<Board> {
  try {
    const data = await gqlClient.request<CreateBoardResult>(CREATE_BOARD_MUTATION, args);
    return data.createBoard;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "板の作成に失敗しました");
    }
    throw e;
  }
}

export async function getThreadsQuery(threadId: string): Promise<Post[]> {
  try {
    const data = await gqlClient.request<GetThreadsResult>(GET_THREADS_QUERY, { threadId });
    return data.getThreads;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "スレッド取得に失敗しました");
    }
    throw e;
  }
}

export async function createPostMutation(args: MutationCreatePostArgs): Promise<Post> {
  try {
    const data = await gqlClient.request<CreatePostResult>(CREATE_POST_MUTATION, args);
    return data.createPost;
  } catch (e) {
    if (e instanceof ClientError) {
      const message = e.response.errors?.[0]?.message;
      throw new Error(message ?? "投稿に失敗しました");
    }
    throw e;
  }
}
