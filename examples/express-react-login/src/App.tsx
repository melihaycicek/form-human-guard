import { useState } from "react";
import { DirectionGuard } from "form-human-guard/react";
import "form-human-guard/styles.css";

export default function App() {
  const [guardToken, setGuardToken] = useState("");
  const [result, setResult] = useState("");

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        guardToken,
      }),
    });
    const data = await res.json();
    setResult(data.ok ? data.message : `Login blocked: ${data.code}`);
    // Guard tokens are one-time: after a submit, a new one is required.
    setGuardToken("");
  }

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Sign in</h1>
      <form onSubmit={submitLogin} style={{ display: "grid", gap: "0.75rem" }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <DirectionGuard endpoint="/guard" onVerified={setGuardToken} />
        <button disabled={!guardToken}>Login</button>
      </form>
      {result && <p role="status">{result}</p>}
    </main>
  );
}
