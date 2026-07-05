import { afterEach, describe, expect, it, vi } from 'vitest';

import { graphql, parse, subscribe, type ExecutionResult } from 'graphql';

import { createSchema } from './schema.js';

const createContext = (overrides = {}) => ({
  profilesLoader: {
    load: async () => undefined,
  },
  ...overrides,
});

const getAsyncIterator = <T>(subscription: unknown) => {
  if (
    subscription &&
    typeof (subscription as AsyncIterable<T>)[Symbol.asyncIterator] ===
      'function'
  ) {
    return (subscription as AsyncIterable<T>)[Symbol.asyncIterator]();
  }

  throw new Error('Expected subscription result to be async iterable.');
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = 1000) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Query.hello', () => {
  it('returns hello message', async () => {
    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: '{ hello }',
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.hello).toBe('Hello GraphQL!');
  });
});

describe('Query.login', () => {
  it('logs in with email and password', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'test@example.com',
        message: 'Login successful!',
        userId: 'user-1',
      }),
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($email: String, $password: String) {
          login(email: $email, password: $password) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'test@example.com',
        password: 'password',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.login).toEqual({
      email: 'test@example.com',
      message: 'Login successful!',
      userId: 'user-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/login', {
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('logs in with userId and password', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'test@example.com',
        message: 'Login successful!',
        userId: 'user-1',
      }),
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($userId: String, $password: String) {
          login(userId: $userId, password: $password) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        password: 'password',
        userId: 'user-1',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.login).toEqual({
      email: 'test@example.com',
      message: 'Login successful!',
      userId: 'user-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/login', {
      body: JSON.stringify({
        identifier: 'user-1',
        password: 'password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('forwards login session cookie to the browser', async () => {
    const setHeader = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => [
          'sessionToken=session-1; Path=/; HttpOnly; Secure; SameSite=Lax',
        ],
      },
      json: async () => ({
        email: 'test@example.com',
        message: 'Login successful!',
        userId: 'user-1',
      }),
    } as unknown as Response);

    const result = await graphql({
      contextValue: createContext({ response: { setHeader } }),
      schema: createSchema(),
      source: `
        query Login($email: String, $password: String) {
          login(email: $email, password: $password) {
            userId
          }
        }
      `,
      variableValues: {
        email: 'test@example.com',
        password: 'password',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(setHeader).toHaveBeenCalledWith('Set-Cookie', [
      'sessionToken=session-1; Path=/; HttpOnly; Secure; SameSite=Lax',
    ]);
  });

  it('returns the current user from the session cookie', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'test@example.com',
        name: 'Test User',
        userId: 'user-1',
      }),
    } as Response);

    const result = await graphql({
      contextValue: createContext({ cookie: 'sessionToken=session-1' }),
      schema: createSchema(),
      source: `
        query Me {
          me {
            userId
            email
            name
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.me).toEqual({
      email: 'test@example.com',
      name: 'Test User',
      userId: 'user-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/me', {
      headers: { Cookie: 'sessionToken=session-1' },
    });
  });

  it('logs out and forwards the expired session cookie to the browser', async () => {
    const setHeader = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: {
        getSetCookie: () => [
          'sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
        ],
      },
      json: async () => ({
        message: 'Logout successful!',
        success: true,
      }),
    } as unknown as Response);

    const result = await graphql({
      contextValue: createContext({
        cookie: 'sessionToken=session-1',
        response: { setHeader },
      }),
      schema: createSchema(),
      source: `
        mutation Logout {
          logout
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.logout).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/logout', {
      headers: { Cookie: 'sessionToken=session-1' },
      method: 'POST',
    });
    expect(setHeader).toHaveBeenCalledWith('Set-Cookie', [
      'sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
    ]);
  });

  it('returns an error when both email and userId are missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($password: String) {
          login(password: $password) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        password: 'password',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      'メールアドレスまたはユーザーIDを入力してください',
    );
    expect(result.data?.login).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when email format is invalid', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($email: String, $password: String) {
          login(email: $email, password: $password) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'not-an-email',
        password: 'password',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      '有効なメールアドレスを入力してください',
    );
    expect(result.data?.login).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when both email and userId are provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($email: String, $userId: String, $password: String) {
          login(email: $email, userId: $userId, password: $password) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'test@example.com',
        password: 'password',
        userId: 'user-1',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('同時に両方の入力はできません');
    expect(result.data?.login).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when password is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query Login($email: String) {
          login(email: $email) {
            userId
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'test@example.com',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('パスワードは必須です');
    expect(result.data?.login).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Query.getUsers', () => {
  it('returns users from backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => [
        {
          email: 'alice@example.com',
          name: 'Alice',
          userId: 'user-1',
        },
        {
          email: 'bob@example.com',
          name: 'Bob',
          userId: 'user-2',
        },
      ],
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query GetUsers {
          getUsers {
            userId
            email
            name
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.getUsers).toEqual([
      {
        email: 'alice@example.com',
        name: 'Alice',
        userId: 'user-1',
      },
      {
        email: 'bob@example.com',
        name: 'Bob',
        userId: 'user-2',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/users');
  });

  it('returns an error when backend user fetch fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Backend unavailable'));

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query GetUsers {
          getUsers {
            userId
            email
            name
          }
        }
      `,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('Backend unavailable');
    expect(result.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/users');
  });
});

describe('Query.getThreads', () => {
  it('returns posts in a thread from backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => [
        {
          content: 'First post',
          createdAt: '2026-06-10T00:00:00.000Z',
          id: 'post-1',
          parentId: null,
          threadId: 'thread-1',
          title: 'Hello',
          userId: 'user-1',
          userName: 'Alice',
        },
        {
          content: 'Reply post',
          createdAt: '2026-06-10T00:01:00.000Z',
          id: 'post-2',
          parentId: 'post-1',
          threadId: 'thread-1',
          title: null,
          userId: 'user-2',
          userName: 'Bob',
        },
      ],
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query GetThreads($threadId: String!) {
          getThreads(threadId: $threadId) {
            id
            parentId
            threadId
            userId
            title
            userName
            content
            createdAt
          }
        }
      `,
      variableValues: {
        threadId: 'thread-1',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.getThreads).toEqual([
      {
        content: 'First post',
        createdAt: '2026-06-10T00:00:00.000Z',
        id: 'post-1',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      },
      {
        content: 'Reply post',
        createdAt: '2026-06-10T00:01:00.000Z',
        id: 'post-2',
        parentId: 'post-1',
        threadId: 'thread-1',
        title: null,
        userId: 'user-2',
        userName: 'Bob',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://nginx/api/posts/threads/thread-1',
    );
  });

  it('returns an error when backend thread fetch fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Backend unavailable'));

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        query GetThreads($threadId: String!) {
          getThreads(threadId: $threadId) {
            id
            parentId
            threadId
            userId
            title
            userName
            content
            createdAt
          }
        }
      `,
      variableValues: {
        threadId: 'thread-1',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('Backend unavailable');
    expect(result.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://nginx/api/posts/threads/thread-1',
    );
  });
});

describe('Mutation.createUser', () => {
  it('creates a user through backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        email: 'new-user@example.com',
        message: 'User, Auth, and Profile created successfully!',
        password: 'generated-password',
        userId: 'user-1',
      }),
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreateUser($email: String!, $password: String) {
          createUser(email: $email, password: $password) {
            userId
            password
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'new-user@example.com',
        password: 'password',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createUser).toEqual({
      email: 'new-user@example.com',
      message: 'User, Auth, and Profile created successfully!',
      password: 'generated-password',
      userId: 'user-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/users', {
      body: JSON.stringify({
        email: 'new-user@example.com',
        password: 'password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('returns an error when email format is invalid', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreateUser($email: String!, $password: String) {
          createUser(email: $email, password: $password) {
            userId
            password
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'not-an-email',
        password: 'password123',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe(
      '有効なメールアドレスを入力してください',
    );
    expect(result.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when backend user creation fetch fails', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Backend unavailable'));

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreateUser($email: String!, $password: String) {
          createUser(email: $email, password: $password) {
            userId
            password
            email
            message
          }
        }
      `,
      variableValues: {
        email: 'new-user@example.com',
        password: 'password',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('Backend unavailable');
    expect(result.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/users', {
      body: JSON.stringify({
        email: 'new-user@example.com',
        password: 'password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });
});

describe('Mutation.createPost', () => {
  it('creates a post through backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'First post',
        createdAt: '2026-06-10T00:00:00.000Z',
        id: 'post-1',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      }),
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreatePost(
          $parentId: ID
          $threadId: String!
          $userId: String!
          $title: String
          $userName: String
          $content: String
        ) {
          createPost(
            parentId: $parentId
            threadId: $threadId
            userId: $userId
            title: $title
            userName: $userName
            content: $content
          ) {
            id
            parentId
            threadId
            userId
            title
            userName
            content
            createdAt
          }
        }
      `,
      variableValues: {
        content: 'First post',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createPost).toEqual({
      content: 'First post',
      createdAt: '2026-06-10T00:00:00.000Z',
      id: 'post-1',
      parentId: null,
      threadId: 'thread-1',
      title: 'Hello',
      userId: 'user-1',
      userName: 'Alice',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/posts', {
      body: JSON.stringify({
        parentId: null,
        threadId: 'thread-1',
        userId: 'user-1',
        title: 'Hello',
        userName: 'Alice',
        content: 'First post',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('returns an error when threadId is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreatePost(
          $threadId: String!
          $userId: String!
        ) {
          createPost(threadId: $threadId, userId: $userId) {
            id
            threadId
            userId
            createdAt
          }
        }
      `,
      variableValues: {
        threadId: '',
        userId: 'user-1',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('スレッドIDは必須です');
    expect(result.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when userId is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreatePost(
          $threadId: String!
          $userId: String!
        ) {
          createPost(threadId: $threadId, userId: $userId) {
            id
            threadId
            userId
            createdAt
          }
        }
      `,
      variableValues: {
        threadId: 'thread-1',
        userId: '',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('ユーザーIDは必須です');
    expect(result.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when backend post creation responds with ok false', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
    } as Response);

    const result = await graphql({
      contextValue: createContext(),
      schema: createSchema(),
      source: `
        mutation CreatePost(
          $parentId: ID
          $threadId: String!
          $userId: String!
          $title: String
          $userName: String
          $content: String
        ) {
          createPost(
            parentId: $parentId
            threadId: $threadId
            userId: $userId
            title: $title
            userName: $userName
            content: $content
          ) {
            id
            parentId
            threadId
            userId
            title
            userName
            content
            createdAt
          }
        }
      `,
      variableValues: {
        content: 'First post',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('投稿の作成に失敗しました。');
    expect(result.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/posts', {
      body: JSON.stringify({
        parentId: null,
        threadId: 'thread-1',
        userId: 'user-1',
        title: 'Hello',
        userName: 'Alice',
        content: 'First post',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });
});

describe('Subscription.userCreated', () => {
  it('receives a user created payload published by createUser mutation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({
        email: 'new-user@example.com',
        message: 'User, Auth, and Profile created successfully!',
        password: 'generated-password',
        userId: 'user-1',
      }),
    } as Response);
    const schema = createSchema();
    const subscription = await subscribe({
      document: parse(`
        subscription UserCreated {
          userCreated {
            userId
            password
            email
            message
          }
        }
      `),
      schema,
    });
    const iterator = getAsyncIterator<ExecutionResult>(subscription);
    const nextResult = iterator.next();

    try {
      const mutationResult = await graphql({
        contextValue: createContext(),
        schema,
        source: `
          mutation CreateUser($email: String!, $password: String) {
            createUser(email: $email, password: $password) {
              userId
              password
              email
              message
            }
          }
        `,
        variableValues: {
          email: 'new-user@example.com',
          password: 'password',
        },
      });
      const received = await withTimeout(nextResult);

      expect(mutationResult.errors).toBeUndefined();
      expect(received.done).toBe(false);
      expect(received.value.errors).toBeUndefined();
      expect(received.value.data?.userCreated).toEqual({
        email: 'new-user@example.com',
        message: 'User, Auth, and Profile created successfully!',
        password: 'generated-password',
        userId: 'user-1',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/users', {
        body: JSON.stringify({
          email: 'new-user@example.com',
          password: 'password',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } finally {
      await iterator.return?.();
    }
  });
});

describe('Subscription.onNewPost', () => {
  it('receives a new post payload published by createPost mutation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        content: 'First post',
        createdAt: '2026-06-10T00:00:00.000Z',
        id: 'post-1',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      }),
    } as Response);
    const schema = createSchema();
    const subscription = await subscribe({
      document: parse(`
        subscription OnNewPost($threadId: String!) {
          onNewPost(threadId: $threadId) {
            id
            parentId
            threadId
            userId
            title
            userName
            content
            createdAt
          }
        }
      `),
      schema,
      variableValues: {
        threadId: 'thread-1',
      },
    });
    const iterator = getAsyncIterator<ExecutionResult>(subscription);
    const nextResult = iterator.next();

    try {
      const mutationResult = await graphql({
        contextValue: createContext(),
        schema,
        source: `
          mutation CreatePost(
            $parentId: ID
            $threadId: String!
            $userId: String!
            $title: String
            $userName: String
            $content: String
          ) {
            createPost(
              parentId: $parentId
              threadId: $threadId
              userId: $userId
              title: $title
              userName: $userName
              content: $content
            ) {
              id
              parentId
              threadId
              userId
              title
              userName
              content
              createdAt
            }
          }
        `,
        variableValues: {
          content: 'First post',
          parentId: null,
          threadId: 'thread-1',
          title: 'Hello',
          userId: 'user-1',
          userName: 'Alice',
        },
      });
      const received = await withTimeout(nextResult);

      expect(mutationResult.errors).toBeUndefined();
      expect(received.done).toBe(false);
      expect(received.value.errors).toBeUndefined();
      expect(received.value.data?.onNewPost).toEqual({
        content: 'First post',
        createdAt: '2026-06-10T00:00:00.000Z',
        id: 'post-1',
        parentId: null,
        threadId: 'thread-1',
        title: 'Hello',
        userId: 'user-1',
        userName: 'Alice',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('http://nginx/api/posts', {
        body: JSON.stringify({
          parentId: null,
          threadId: 'thread-1',
          userId: 'user-1',
          title: 'Hello',
          userName: 'Alice',
          content: 'First post',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } finally {
      await iterator.return?.();
    }
  });
});
