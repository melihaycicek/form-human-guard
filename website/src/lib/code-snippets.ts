/** Landing-page code examples. Kept honest: all APIs exist in v0.2. */

export const reactSnippet = `import { SubmitGuard } from "form-human-guard/react";

export function SignupForm() {
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        guardToken: form.get("guardToken"), // filled in by SubmitGuard
      }),
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" required />
      {/* Invisible until submit — then the rotate-to-match overlay opens */}
      <SubmitGuard theme="midnight" />
      <button>Create account</button>
    </form>
  );
}`;

export const nextSnippet = `// app/api/guard/challenge/route.ts — this site's own pattern
import { createDirectionMatchChallenge } from "form-human-guard/server";
import { RedisStore } from "form-human-guard/stores";
import { Redis } from "@upstash/redis";

const store = new RedisStore({
  client: upstashAdapter(Redis.fromEnv()), // see /docs/nextjs
  keyPrefix: "fhg:",
});

export const dynamic = "force-dynamic";

export async function GET() {
  const challenge = await createDirectionMatchChallenge({ store });
  return Response.json(challenge, {
    headers: { "Cache-Control": "no-store" },
  });
}`;

export const expressSnippet = `import express from "express";
import { createGuardRoutes, requireGuardToken } from "form-human-guard/express";
import { MemoryStore } from "form-human-guard/stores";

const app = express();
app.use(express.json());

const store = new MemoryStore(); // dev only — use RedisStore in production
const secret = process.env.GUARD_SECRET!;

app.use("/guard", createGuardRoutes({ store, secret, action: "signup" }));

app.post(
  "/signup",
  requireGuardToken({ store, secret, action: "signup" }),
  (req, res) => res.json({ ok: true }) // token verified AND consumed
);`;
