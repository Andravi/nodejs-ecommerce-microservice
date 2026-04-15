const chai = require("chai");
const chaiHttp = require("chai-http");
const expect = chai.expect;

chai.use(chaiHttp);

const API_GATEWAY = process.env.API_GATEWAY_URL || "http://localhost:3003";
const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000";

describe("INTEGRATION TESTS - ECOMMERCE MICROSERVICES", function () {
  let token;

  // 🔐 Autenticação base para vários testes
  before(async () => {
    const res = await chai.request(AUTH_URL).post("/login").send({
      username: process.env.LOGIN_TEST_USER,
      password: process.env.LOGIN_TEST_PASSWORD,
    });

    token = res.body.token;
  });

  // =========================
  // IT-01
  // =========================
  describe("IT-01: Dashboard sem token", () => {
    it("deve retornar 401", async () => {
      const res = await chai.request(API_GATEWAY).get("/auth/dashboard");

      expect(res).to.have.status(401);
      expect(res.body).to.have.property(
        "message",
        "No token, authorization denied",
      );
    });
  });

  // =========================
  // IT-02
  // =========================
  describe("IT-02: Listagem de produtos sem autenticação", () => {
    it("deve retornar 401", async () => {
      const res = await chai.request(API_GATEWAY).get("/products/api/products");

      expect(res).to.have.status(401);
    });
  });

  // =========================
  // IT-03
  // =========================
  describe("IT-03: Listagem com autenticação válida", () => {
    it("deve retornar 200 e array", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .get("/products/api/products")
        .set("Authorization", `Bearer ${token}`);

      expect(res).to.have.status(200);
      expect(res.body).to.be.an("array");

      if (res.body.length > 0) {
        expect(res.body[0]).to.have.property("_id");
        expect(res.body[0]).to.have.property("name");
        expect(res.body[0]).to.have.property("price");
      }
    });
  });

  // =========================
  // IT-04
  // =========================
  describe("IT-04: Criação de produto", () => {
    it("deve criar produto com sucesso", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Produto IT",
          price: 99.9,
        });

      expect(res).to.have.status(201);
      expect(res.body).to.have.property("_id");
      expect(res.body).to.have.property("name", "Produto IT");
    });
  });

  // =========================
  // IT-05
  // =========================
  describe("IT-05: Username extremamente longo", () => {
    it("deve falhar com username > 1000 caracteres", async () => {
      const longUsername = "a".repeat(1001);

      const res = await chai.request(API_GATEWAY).post("/auth/register").send({
        username: longUsername,
        password: "123",
      });

      // ⚠️ Pode falhar se não houver validação no model
      expect(res).to.have.status(400);
    });
  });

  // =========================
  // IT-06
  // =========================
  describe("IT-06: Consulta de status de pedido", () => {
    let orderId;

    it("deve criar pedido", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ids: [], // ⚠️ ajustar para IDs válidos se necessário
        });

      orderId = res.body.orderId;
    });

    it("deve consultar status do pedido", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .get(`/orders/api/orders/status/${orderId}`);

      // ⚠️ Provavelmente falha (sem rota implementada)
      expect(res).to.have.status(200);
      expect(res.body).to.have.property("status");
    });
  });

  // =========================
  // IT-07
  // =========================
  describe("IT-07: Timeout sem RabbitMQ", function () {
    this.timeout(40000);

    it("deve retornar timeout quando broker não responde", async () => {
      const res = await chai
        .request(API_GATEWAY)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ids: ["fakeId"],
        });

      // ⚠️ comportamento não implementado no código atual
      expect([408, 504]).to.include(res.status);
    });
  });
});
