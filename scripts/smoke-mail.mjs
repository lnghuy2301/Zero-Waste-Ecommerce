import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000/api/v1";
const inbox = "http://127.0.0.1:8025/api/v1";
const email = "mail-test-" + Date.now() + "@example.com";
const password = process.env.DEMO_PASSWORD || "MailDemo123!";
const send = async (path, body) => {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, data: await response.json() };
};
const signup = await send("/auth/register", {
  email,
  password,
  role: "CUSTOMER",
  isActive: true,
  profile: { fullName: "Mail test" },
});
assert.equal(signup.status, 201);
let messageId;
try {
  assert.equal((await send("/account/forgot-password", { email })).status, 201);
  const messages = await (await fetch(inbox + "/messages")).json();
  const summary = messages.messages.find((m) =>
    m.To.some((to) => to.Address === email),
  );
  assert.ok(summary, "Reset email must arrive in local Mailpit");
  messageId = summary.ID;
  const message = await (await fetch(inbox + "/message/" + messageId)).json();
  const url = new URL(message.Text.match(/http[^\s]+/)[0]);
  const reset = {
    email,
    token: url.searchParams.get("token"),
    newPassword: "NewMailDemo123!",
  };
  assert.equal((await send("/account/reset-password", reset)).status, 201);
  assert.equal(
    (await send("/auth/login", { email, password: reset.newPassword })).status,
    201,
  );
  assert.equal((await send("/account/reset-password", reset)).status, 400);
  assert.ok(
    [400, 401].includes(
      (await send("/auth/login", { email, password })).status,
    ),
  );
  console.log(
    "PASS: local SMTP delivery, password reset, old-password rejection and token replay prevention.",
  );
} finally {
  const admin = (
    await send("/auth/login", {
      email: "admin@example.com",
      password: process.env.DEMO_PASSWORD || "EcoDemo123!",
    })
  ).data;
  await fetch(base + "/account/" + signup.data.id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + admin.token },
  });
  if (messageId)
    await fetch(inbox + "/message/" + messageId, { method: "DELETE" });
}
