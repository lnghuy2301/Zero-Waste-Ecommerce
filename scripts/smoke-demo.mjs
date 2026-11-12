import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.SMOKE_API_URL || "http://127.0.0.1:3000/api/v1";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname))
  throw new Error("Smoke tests only run against a local demo API.");
const tag = randomUUID().slice(0, 8);
const password = process.env.DEMO_PASSWORD || "EcoDemo123!";
let checks = 0;
async function call(path, method = "GET", body, token, expected = [200, 201]) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.ok(
    expected.includes(response.status),
    method +
      " " +
      path +
      ": " +
      response.status +
      " " +
      JSON.stringify(data.message || ""),
  );
  checks++;
  return data;
}
const login = (email, pass = password) =>
  call("/auth/login", "POST", { email, password: pass });
const admin = await login("admin@example.com");
const customer = await login("customer@example.com");
let other, product, variant, promotion;
const orders = [];
const cartIds = [];
try {
  await call("/health");
  await call("/order", "POST", {}, undefined, [401]);
  await call("/auth/register", "POST", {
    email: "smoke-" + tag + "@example.com",
    password,
    role: "ADMIN",
    isActive: true,
    profile: { fullName: "Smoke test account" },
  });
  other = await login("smoke-" + tag + "@example.com");
  assert.equal(
    other.role,
    "CUSTOMER",
    "Public registration must never grant ADMIN",
  );
  const account = await call(
    "/account/" + other.id,
    "GET",
    undefined,
    other.token,
  );
  for (const key of ["password", "resetPasswordToken", "resetPasswordExpires"])
    assert.ok(!(key in account), key + " leaked");
  await call(
    "/customer_profile/" + other.id + "/profile",
    "GET",
    undefined,
    customer.token,
    [403],
  );
  await call("/cart/user/" + other.id, "GET", undefined, customer.token, [403]);
  await call(
    "/comments/1/visibility",
    "PATCH",
    { isHidden: true },
    customer.token,
    [403],
  );
  await call("/order-detail/1", "GET", undefined, undefined, [404]);
  await call("/green-certificate");
  await call("/product?minPrice=abc", "GET", undefined, undefined, [400]);
  await call(
    "/product?minPrice=200&maxPrice=100",
    "GET",
    undefined,
    undefined,
    [400],
  );

  const categories = await call("/category");
  product = await call(
    "/product",
    "POST",
    {
      name: "Smoke test " + tag,
      slug: "smoke-" + tag,
      categoryId: categories[0].id,
    },
    admin.token,
  );
  promotion = await call(
    "/promotion",
    "POST",
    {
      code: "SMOKE" + tag,
      name: "Smoke promotion",
      discountType: "PERCENT",
      discountValue: 10,
      startDate: new Date(Date.now() - 60000).toISOString(),
      endDate: new Date(Date.now() + 3600000).toISOString(),
      isActive: true,
    },
    admin.token,
  );
  variant = await call(
    "/product-variant",
    "POST",
    {
      productId: product.id,
      sku: "SMOKE-" + tag,
      name: "Last unit",
      price: 100000,
      stock: 1,
      promotionId: promotion.id,
    },
    admin.token,
  );
  const ownCart = await call(
    "/cart",
    "POST",
    { accountId: customer.id, variantId: variant.id, quantity: 1 },
    customer.token,
  );
  const otherCart = await call(
    "/cart",
    "POST",
    { accountId: other.id, variantId: variant.id, quantity: 1 },
    other.token,
  );
  cartIds.push(
    { id: ownCart.id, token: customer.token },
    { id: otherCart.id, token: other.token },
  );
  const removed = await call(
    "/cart",
    "DELETE",
    { Ids: [ownCart.id, otherCart.id] },
    customer.token,
  );
  assert.equal(removed.count, 1);
  assert.ok(
    (await call("/cart/user/" + other.id, "GET", undefined, other.token)).some(
      (item) => item.id === otherCart.id,
    ),
  );
  const methods = await call("/payment-method");
  const cod = methods.find((m) => m.code === "COD");
  const demo = methods.find((m) => m.code === "MOMO_DEMO");
  assert.ok(cod && demo, "Run db:seed first");
  const payload = (user, quantity = 1) => ({
    accountId: user.id,
    paymentMethodId: cod.id,
    shippingAddress: "Smoke - 0900000000 - Demo",
    items: [{ variantId: variant.id, quantity }],
  });
  for (const quantity of [-1, 0, 1.5, 21])
    await call(
      "/order",
      "POST",
      payload(customer, quantity),
      customer.token,
      [400],
    );
  await call(
    "/order",
    "POST",
    { ...payload(customer), items: [] },
    customer.token,
    [400],
  );
  await call(
    "/order",
    "POST",
    {
      ...payload(customer),
      items: [{ variantId: variant.id, quantity: 1, price: 0 }],
    },
    customer.token,
    [400],
  );
  await call("/order", "POST", payload(customer, 2), customer.token, [409]);

  const outcomes = await Promise.all(
    [customer, other].map(async (user) => {
      const response = await fetch(base + "/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + user.token,
        },
        body: JSON.stringify(payload(user)),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (response.status === 201) orders.push(data.id);
      return { status: response.status, data, user };
    }),
  );
  assert.deepEqual(
    outcomes.map((o) => o.status).sort(),
    [201, 409],
    "Only one concurrent checkout may buy the last unit",
  );
  const winner = outcomes.find((o) => o.status === 201);
  assert.equal(
    winner.data.totalAmount,
    120000,
    "90,000 discounted item + 30,000 shipping",
  );
  assert.equal((await call("/product-variant/" + variant.id)).stock, 0);
  const stranger = winner.user.id === customer.id ? other : customer;
  await call(
    "/order/" + winner.data.id,
    "GET",
    undefined,
    stranger.token,
    [403],
  );
  await call(
    "/order/" + winner.data.id,
    "DELETE",
    undefined,
    winner.user.token,
  );
  await call(
    "/order/" + winner.data.id,
    "DELETE",
    undefined,
    winner.user.token,
    [400],
  );
  assert.equal(
    (await call("/product-variant/" + variant.id)).stock,
    1,
    "Cancellation restores stock once",
  );

  const paid = await call(
    "/order",
    "POST",
    { ...payload(customer), paymentMethodId: demo.id },
    customer.token,
  );
  orders.push(paid.id);
  await call(
    "/order/" + paid.id + "/demo-payment",
    "POST",
    undefined,
    other.token,
    [403],
  );
  assert.equal(
    (
      await call(
        "/order/" + paid.id + "/demo-payment",
        "POST",
        undefined,
        customer.token,
      )
    ).status,
    "PAID",
  );
  assert.equal(
    (
      await call(
        "/order/" + paid.id + "/demo-payment",
        "POST",
        undefined,
        customer.token,
      )
    ).status,
    "PAID",
  );
  await call(
    "/order/" + paid.id + "/status",
    "PUT",
    { status: "COMPLETED" },
    admin.token,
    [400],
  );
  await call(
    "/order/" + paid.id + "/status",
    "PUT",
    { status: "SHIPPING" },
    admin.token,
  );
  await call(
    "/order/" + paid.id + "/status",
    "PUT",
    { status: "COMPLETED" },
    admin.token,
  );
  const review = await call(
    "/comments/product/" + product.id,
    "POST",
    { content: "Smoke review", rating: 5 },
    customer.token,
  );
  assert.equal((await call("/product/" + product.id)).danhGiaTrungBinh, 5);
  await call(
    "/comments/" + review.id + "/visibility",
    "PATCH",
    { isHidden: true },
    admin.token,
  );
  assert.equal((await call("/comments?productId=" + product.id)).length, 0);
  assert.equal((await call("/product/" + product.id)).soLuongDanhGia, 0);
  await call("/product?minPrice=50000&maxPrice=200000&sort=price_asc");
  const stats = await call("/order/stats", "GET", undefined, admin.token);
  assert.equal(stats.monthlyRevenue.length, 12);
  console.log(
    "PASS: " +
      checks +
      " HTTP checks plus stock race, totals, ownership and payment invariants.",
  );
} finally {
  for (const item of cartIds)
    await call("/cart", "DELETE", { Ids: [item.id] }, item.token).catch(
      () => {},
    );
  if (orders.length)
    await call("/order", "DELETE", { Ids: orders }, admin.token).catch(
      () => {},
    );
  if (variant)
    await call(
      "/product-variant/" + variant.id,
      "DELETE",
      undefined,
      admin.token,
    ).catch(() => {});
  if (product)
    await call(
      "/product/" + product.id,
      "DELETE",
      undefined,
      admin.token,
    ).catch(() => {});
  if (promotion)
    await call(
      "/promotion/" + promotion.id,
      "DELETE",
      undefined,
      admin.token,
    ).catch(() => {});
  if (other)
    await call("/account/" + other.id, "DELETE", undefined, admin.token).catch(
      () => {},
    );
}
