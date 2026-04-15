// const chai = require("chai");
// const { expect } = require("chai");

// const chaiHttp = require("chai-http");
// chai.use(chaiHttp);
// const GATEWAY_URL = "http://localhost:3003";


// describe("Testes de Integração: Fluxo de Pedidos e Timeout", () => {
//   let validToken = "";
//   let productId = "";

//   before(async () => {
//     const login = await chai
//       .request(GATEWAY_URL)
//       .post("/auth/login")
//       .send({ username: "it_user", password: "password123" });
//     validToken = login.body.token;

//     // Criar um produto real para poder comprar
//     const prod = await chai
//       .request(GATEWAY_URL)
//       .post("/products/api/products")
//       .set("Authorization", `Bearer ${validToken}`)
//       .send({ name: "Item Pedido", price: 50 });
//     productId = prod.body._id;
//   });

//   it("IT-06: Fluxo completo de criação e consulta de status de pedido", async function () {
//     this.timeout(10000); // Aumenta timeout do Mocha para lidar com o long polling

//     // Passo 1: Comprar
//     const buyRes = await chai
//       .request(GATEWAY_URL)
//       .post("/products/api/products/buy")
//       .set("Authorization", `Bearer ${validToken}`)
//       .send({ ids: [productId] });

//     expect(buyRes).to.have.status(201);
//     const orderId = buyRes.body.orderId;

//     // Passo 2: Consultar via Gateway
//     const statusRes = await chai
//       .request(GATEWAY_URL)
//       .get(`/products/api/products/status/${orderId}`) // Ajustado para rota do ProductController
//       .set("Authorization", `Bearer ${validToken}`);

//     expect(statusRes).to.have.status(200);
//     expect(statusRes.body).to.have.property("status");
//   });

//   it("IT-07: Simulação de Timeout no Long Polling (RabbitMQ Offline)", async function () {
//     // ATENÇÃO: Este teste pressupõe que o RabbitMQ está inacessível
//     this.timeout(35000); // Maior que o timeout de 30s do sistema

//     const res = await chai
//       .request(GATEWAY_URL)
//       .post("/products/api/products/buy")
//       .set("Authorization", `Bearer ${validToken}`)
//       .send({ ids: [productId] });

//     // Se o RabbitMQ estiver fora, o controlador deve retornar 500/504 após o loop
//     expect(res).to.have.status(500);
//     expect(res.body.message).to.equal("Server error");
//   });
// });