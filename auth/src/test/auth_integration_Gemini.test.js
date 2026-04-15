// const chai = require("chai");
// const { expect } = require("chai");

// const chaiHttp = require("chai-http");
// chai.use(chaiHttp);
// const GATEWAY_URL = "http://localhost:3003";

// describe("Testes de Integração: Segurança e Listagem", () => {
//   let validToken = "";

//   before(async () => {
//     // Setup: Criar usuário e logar para obter token para os testes IT-03 e IT-04
//     await chai
//       .request(GATEWAY_URL)
//       .post("/auth/register")
//       .send({ username: "it_user", password: "password123" });
//     const res = await chai
//       .request(GATEWAY_URL)
//       .post("/auth/login")
//       .send({ username: "it_user", password: "password123" });
//     validToken = res.body.token;
//   });

//   it("IT-01: Acesso ao dashboard sem token deve retornar 401", async () => {
//     const res = await chai.request(GATEWAY_URL).get("/auth/dashboard");
//     expect(res).to.have.status(401);
//     expect(res.body).to.have.property(
//       "message",
//       "No token, authorization denied",
//     );
//   });

//   it("IT-02: Listagem de produtos sem autenticação deve retornar 401", async () => {
//     // Nota: O serviço de produto usa o middleware isAuthenticated.js
//     const res = await chai.request(GATEWAY_URL).get("/products/api/products");
//     expect(res).to.have.status(401);
//   });

//   it("IT-03: Listagem de produtos com autenticação válida", async () => {
//     const res = await chai
//       .request(GATEWAY_URL)
//       .get("/products/api/products")
//       .set("x-auth-token", validToken) // Middleware do Auth espera x-auth-token
//       .set("Authorization", `Bearer ${validToken}`); // Middleware do Product espera Bearer

//     expect(res).to.have.status(200);
//     expect(res.body).to.be.an("array");
//   });
// });

// describe("Testes de Integração: Produtos e Validação de Limites", () => {
//   let validToken = "";

//   before(async () => {
//     const res = await chai
//       .request(GATEWAY_URL)
//       .post("/auth/login")
//       .send({ username: "it_user", password: "password123" });
//     validToken = res.body.token;
//   });

//   it("IT-04: Criação de produto com autenticação válida e verificação em banco", async () => {
//     const productData = { name: "Produto IT", price: 99.9 };
//     const res = await chai
//       .request(GATEWAY_URL)
//       .post("/products/api/products")
//       .set("Authorization", `Bearer ${validToken}`)
//       .send(productData);

//     expect(res).to.have.status(201);
//     expect(res.body).to.have.property("_id");
//     expect(res.body.name).to.equal("Produto IT");

//     // Verificação secundária: Listar para confirmar persistência
//     const checkRes = await chai
//       .request(GATEWAY_URL)
//       .get("/products/api/products")
//       .set("Authorization", `Bearer ${validToken}`);

//     const exists = checkRes.body.some((p) => p._id === res.body._id);
//     expect(exists).to.be.true;
//   });

//   it("IT-05: Registro com nome de usuário extremamente longo (>1000 chars)", async () => {
//     const longUsername = "a".repeat(1001);
//     const res = await chai
//       .request(GATEWAY_URL)
//       .post("/auth/register")
//       .send({ username: longUsername, password: "123" });

//     // Se o Mongoose não tiver maxlength, este teste falhará (retornando 200)
//     expect(res).to.have.status(400);
//   });
// });