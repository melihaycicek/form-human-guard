# express-react-login example

A minimal login form protected by `form-human-guard`:

- `server.ts` — Express server with the guard routes mounted at `/guard` and a `/login` endpoint that requires a fresh one-time guard token.
- `src/App.tsx` — React login form using `<DirectionGuard />`.

## Run the server

Build the package first (from the repository root):

```bash
npm install
npm run build
```

Then, in this directory:

```bash
npm install
npm run server
```

The API is now available on `http://localhost:3000`.

## Run the React form

`src/App.tsx` is a standard React component — drop it into any React dev setup (for example a fresh Vite `react-ts` app) and proxy the API routes to the Express server, e.g. in `vite.config.ts`:

```ts
export default {
  server: {
    proxy: {
      "/guard": "http://localhost:3000",
      "/login": "http://localhost:3000",
    },
  },
};
```

Drag the arrow direction (or use the arrow keys) to unlock the Login button, then submit. Each submit consumes the token, so the guard must be solved again for the next attempt.
