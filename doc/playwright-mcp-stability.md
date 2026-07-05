# Playwright MCP stability notes

Playwright MCP is a required tool for local UI inspection in future projects.
When it is unstable, first suspect the network path from the MCP browser process
to the app, not the DOM operation itself.

## Symptom

Treat these as network or entrypoint problems before debugging selectors:

- The site cannot be reached from Playwright MCP.
- Navigation succeeds sometimes and fails sometimes.
- The DOM is empty or not available.
- The screenshot shows a browser error page, a blank app shell, or a permanent loading state.

## Preferred Setup

Use an nginx container as the stable browser entrypoint.

```text
Playwright MCP
  -> https://127.0.0.1 or http://127.0.0.1:<published-port>
  -> nginx container
  -> app container
```

The app dev server should bind to `0.0.0.0`, not only `127.0.0.1`.

```sh
npm run dev -- --host 0.0.0.0
```

Playwright MCP should access only the nginx published URL. Avoid switching
between the raw dev server URL, `localhost`, `127.0.0.1`, and container service
names during the same investigation.

## Why nginx helps

nginx makes the entrypoint stable by normalizing:

- the browser-facing URL
- host headers
- HTTP version
- WebSocket upgrade headers
- TLS termination
- redirects
- upstream service names
- timeouts

It also avoids a common `localhost` trap: `localhost` means the current process
or container, and that meaning changes depending on where the browser process is
running.

## nginx proxy baseline

```nginx
location / {
  proxy_pass http://app:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Adjust `app:3000` to the service name and port in the compose stack.

## Avoid a separate Playwright container first

A dedicated Playwright container can work, but it usually adds more moving
parts:

- browser dependencies
- fonts
- Chromium sandbox settings
- `/dev/shm` sizing
- Docker network naming
- `localhost` vs service-name confusion
- health-check and startup ordering

For MCP-driven local inspection, prefer keeping Playwright MCP thin and making
nginx the stable entrypoint. Add a Playwright container only when there is a
clear need to match CI or run repeatable test suites inside Docker.

If a Playwright container is used, it should access nginx by service name inside
the Docker network, for example `http://nginx`, not `http://localhost:8080`.

## Debug order

1. Confirm the nginx URL responds from the host.
2. Confirm nginx logs show the Playwright MCP request.
3. Confirm app logs show the nginx upstream request.
4. Capture a Playwright MCP screenshot.
5. Check browser console and network failures.

If nginx access is stable but direct dev server access is unstable, record the
issue as an entrypoint or network-path problem. Do not spend time tuning
selectors until the browser can consistently load the same page.
