// const chai = require("chai");
// const chaiHttp = require("chai-http");
// const expect = chai.expect;
// const pLimit = require("p-limit");

// chai.use(chaiHttp);

// // O endereço aponta para o API Gateway que distribui para os serviços
// const GATEWAY_URL = "http://localhost:3003";

// describe("Suíte de Testes E2E - Sistema de E-commerce", function () {
//   this.timeout(60000); // Testes E2E e concorrência exigem mais tempo

//   let authToken = "";
//   let testProductId = "";

//   before(async () => {
//     // Setup: Registrar e Logar para obter token real
//     await chai
//       .request(GATEWAY_URL)
//       .post("/auth/register")
//       .send({ username: "e2e_user", password: "password123" });
//     const loginRes = await chai
//       .request(GATEWAY_URL)
//       .post("/auth/login")
//       .send({ username: "e2e_user", password: "password123" });
//     authToken = loginRes.body.token;

//     // Criar um produto para usar nos testes de compra
//     const prodRes = await chai
//       .request(GATEWAY_URL)
//       .post("/products/api/products")
//       .set("Authorization", `Bearer ${authToken}`)
//       .send({ name: "Produto E2E", price: 10.0 });
//     testProductId = prodRes.body._id;
//   });

//   describe("E2E-01 & E2E-02: Fluxo de Autenticação Global", () => {
//     const protectedRoutes = [
//       { method: "get", path: "/auth/dashboard", authHeader: "x-auth-token" },
//       {
//         method: "get",
//         path: "/products/api/products",
//         authHeader: "Authorization",
//         prefix: "Bearer ",
//       },
//       {
//         method: "post",
//         path: "/products/api/products",
//         authHeader: "Authorization",
//         prefix: "Bearer ",
//       },
//       {
//         method: "post",
//         path: "/products/api/products/buy",
//         authHeader: "Authorization",
//         prefix: "Bearer ",
//       },
//     ];

//     it("E2E-01: Deve permitir acesso com token válido em todas as rotas", async () => {
//       for (const route of protectedRoutes) {
//         const headerValue = route.prefix
//           ? `${route.prefix}${authToken}`
//           : authToken;
//         const res = await chai
//           .request(GATEWAY_URL)
//           [route.method](route.path)
//           .set(route.authHeader, headerValue)
//           .send({ ids: [testProductId], name: "Test", price: 1 }); // corpo dummy para posts

//         expect(res.status).to.not.equal(401, `Falha na rota ${route.path}`);
//       }
//     });

//     it("E2E-02: Deve bloquear acesso (401) sem token em todas as rotas", async () => {
//       for (const route of protectedRoutes) {
//         const res = await chai.request(GATEWAY_URL)[route.method](route.path);
//         expect(res.status).to.equal(
//           401,
//           `Rota ${route.path} permitiu acesso indevido`,
//         );
//       }
//     });
//   });

//   describe("E2E-03: Stress Test - 100 Pedidos Simultâneos", () => {
//     it("Deve processar 100 compras concorrentes sem perda de dados", async () => {
//       const limit = pLimit(20); // Limita a 20 requisições paralelas por vez para não estourar o socket
//       const requests = [];

//       for (let i = 0; i < 100; i++) {
//         requests.push(
//           limit(() =>
//             chai
//               .request(GATEWAY_URL)
//               .post("/products/api/products/buy")
//               .set("Authorization", `Bearer ${authToken}`)
//               .send({ ids: [testProductId] }),
//           ),
//         );
//       }

//       const responses = await Promise.all(requests);

//       const orderIds = new Set();
//       responses.forEach((res) => {
//         expect(res).to.have.status(201);
//         expect(res.body).to.have.property("orderId");
//         orderIds.add(res.body.orderId);
//       });

//       // Verifica se todos os IDs são únicos
//       expect(orderIds.size).to.equal(100);
//     });
//   });

//   describe("E2E-04: Segurança de Identidade (Cross-User Check)", () => {
//     it("Deve rejeitar se o username no corpo não condiz com o dono do token", async () => {
//       // Criar Usuário B
//       await chai
//         .request(GATEWAY_URL)
//         .post("/auth/register")
//         .send({ username: "usuarioB", password: "123" });

//       // Tentar comprar usando token do Usuário A (e2e_user), mas alegando ser Usuário B
//       const res = await chai
//         .request(GATEWAY_URL)
//         .post("/products/api/products/buy")
//         .set("Authorization", `Bearer ${authToken}`)
//         .send({
//           username: "usuarioB", // Divergente do token (e2e_user)
//           ids: [testProductId],
//         });

//       // O sistema deve validar se o req.user.id ou username do token bate com o corpo
//       // Se o seu código atual não faz isso, este teste falhará como um alerta de segurança
//       expect(res.status).to.be.oneOf([400, 403]);
//     });
//   });
// });
