const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;

chai.use(chaiHttp);

const API_GATEWAY = process.env.API_GATEWAY_URL || "http://localhost:3003";
const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000";

// util para gerar usuários únicos
function uniqueUser(prefix = "user") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

describe("E2E TESTS - ECOMMERCE MICROSERVICES", function () {
  this.timeout(60000);

  let tokenA;
  let tokenB;
  let usernameA;
  let usernameB;

  // =========================
  // Setup global: cria usuários e tokens
  // =========================
  before(async () => {
    usernameA = uniqueUser("A");
    usernameB = uniqueUser("B");

    // registra A
    await chai
      .request(API_GATEWAY)
      .post("/auth/register")
      .send({ username: usernameA, password: "123" });

    // registra B
    await chai
      .request(API_GATEWAY)
      .post("/auth/register")
      .send({ username: usernameB, password: "123" });

    // login A
    const loginA = await chai
      .request(AUTH_URL)
      .post("/login")
      .send({ username: usernameA, password: "123" });

    tokenA = loginA.body.token;

    // login B
    const loginB = await chai
      .request(AUTH_URL)
      .post("/login")
      .send({ username: usernameB, password: "123" });

    tokenB = loginB.body.token;
  });

  // =========================
  // E2E-01
  // =========================
  describe("E2E-01: Rotas protegidas com token válido", () => {
    it("não deve retornar 401", async () => {
      const routes = [
        {
          method: "get",
          url: "/auth/dashboard",
          headers: { "x-auth-token": tokenA },
        },
        {
          method: "get",
          url: "/products/api/products",
          headers: { Authorization: `Bearer ${tokenA}` },
        },
        {
          method: "post",
          url: "/products/api/products",
          headers: { Authorization: `Bearer ${tokenA}` },
          body: { name: "P1", price: 10 },
        },
        {
          method: "post",
          url: "/products/api/products/buy",
          headers: { Authorization: `Bearer ${tokenA}` },
          body: { ids: [] },
        },
      ];

      for (const route of routes) {
        let req = chai.request(API_GATEWAY)[route.method](route.url);

        if (route.headers) {
          Object.entries(route.headers).forEach(([k, v]) => req.set(k, v));
        }

        if (route.body) {
          req = req.send(route.body);
        }

        const res = await req;

        expect(res.status).to.not.equal(401);
      }
    });
  });

  // =========================
  // E2E-02
  // =========================
  describe("E2E-02: Rotas protegidas sem token", () => {
    it("todas devem retornar 401", async () => {
      const routes = [
        { method: "get", url: "/auth/dashboard" },
        { method: "get", url: "/products/api/products" },
        {
          method: "post",
          url: "/products/api/products",
          body: { name: "P2", price: 20 },
        },
        {
          method: "post",
          url: "/products/api/products/buy",
          body: { ids: [] },
        },
      ];

      for (const route of routes) {
        let req = chai.request(API_GATEWAY)[route.method](route.url);

        if (route.body) {
          req = req.send(route.body);
        }

        const res = await req;

        expect(res).to.have.status(401);
      }
    });
  });

  // =========================
  // E2E-03
  // =========================
  describe("E2E-03: 100 pedidos simultâneos", () => {
    it("deve criar 100 pedidos concorrentes", async () => {
      const requests = [];

      for (let i = 0; i < 100; i++) {
        requests.push(
          chai
            .request(API_GATEWAY)
            .post("/products/api/products/buy")
            .set("Authorization", `Bearer ${tokenA}`)
            .send({ ids: [] }), // ⚠️ ideal usar IDs reais
        );
      }

      const responses = await Promise.all(requests);

      const orderIds = new Set();

      responses.forEach((res) => {
        expect(res.status).to.be.oneOf([200, 201]);

        if (res.body && res.body.orderId) {
          orderIds.add(res.body.orderId);
        }
      });

      // verificar unicidade
      expect(orderIds.size).to.equal(responses.length);

      // ⚠️ verificação de persistência real depende do serviço Order expor API ou acesso ao banco
      // Aqui apenas indicamos expectativa:
      // expect(totalOrdersNoBanco).to.equal(100);
    });
  });

  // =========================
  // E2E-04
  // =========================
  describe("E2E-04: Segurança - usuário não pode agir por outro", () => {
    it("deve rejeitar requisição com username diferente do token", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          username: usernameB, // tentando agir como outro usuário
          ids: [],
        });

      // ⚠️ código atual NÃO valida isso → teste deve falhar
      expect([400, 403]).to.include(res.status);
    });
  });
});
