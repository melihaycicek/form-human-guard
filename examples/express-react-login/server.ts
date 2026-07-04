import express from "express";
import { createGuardRoutes, requireGuardToken } from "form-human-guard/express";
import { MemoryStore } from "form-human-guard/stores";

const app = express();
app.use(express.json());

const store = new MemoryStore();
const secret = process.env.GUARD_SECRET ?? "dev-only-secret-change-me";

app.use("/guard", createGuardRoutes({ store, secret, difficulty: "easy", action: "login" }));

app.post(
  "/login",
  requireGuardToken({ store, secret, tokenField: "guardToken", action: "login" }),
  (req, res) => {
    const { email } = req.body as { email?: string };
    // Real credential checks go here — the guard only proves a human-like
    // interaction happened right before this submit.
    res.json({ ok: true, message: `Welcome, ${email ?? "user"}!` });
  }
);

const port = 3000;
app.listen(port, () => {
  console.log(`Guard + login server listening on http://localhost:${port}`);
  console.log(`  GET  /guard/challenge`);
  console.log(`  POST /guard/verify`);
  console.log(`  POST /login (requires a fresh guard token)`);
});
