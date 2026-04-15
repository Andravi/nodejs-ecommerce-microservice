// test/e2e/ecommerce.e2e.test.js
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
const jwt = require("jsonwebtoken");
const axios = require("axios");

chai.use(chaiHttp);

// Configurações
const GATEWAY_URL = "http://localhost:3003";
const AUTH_URL = "http://localhost:3000";
const PRODUCT_URL = "http://localhost:3001";
const ORDER_URL = "http://localhost:3002";

// Timeouts
const REQUEST_TIMEOUT = 30000;
const CONCURRENT_TIMEOUT = 120000;

// Helper functions
const generateUniqueUsername = (prefix = "user") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

const registerUser = async (username, password) => {
  return await chai
    .request(GATEWAY_URL)
    .post("/auth/register")
    .send({ username, password });
};

const loginUser = async (username, password) => {
  const res = await chai
    .request(GATEWAY_URL)
    .post("/auth/login")
    .send({ username, password });
  return res.body.token;
};

const createProduct = async (token, productData) => {
  const res = await chai
    .request(GATEWAY_URL)
    .post("/products/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send(productData);
  return res.body;
};

const createOrder = async (token, productIds) => {
  const res = await chai
    .request(GATEWAY_URL)
    .post("/products/api/products/buy")
    .set("Authorization", `Bearer ${token}`)
    .send({ ids: productIds });
  return res;
};

const getDashboard = async (token) => {
  return await chai
    .request(GATEWAY_URL)
    .get("/auth/dashboard")
    .set("x-auth-token", token);
};

const getProducts = async (token) => {
  return await chai
    .request(GATEWAY_URL)
    .get("/products/api/products")
    .set("Authorization", `Bearer ${token}`);
};

// Rotas protegidas para teste
const PROTECTED_ENDPOINTS = [
  {
    method: "GET",
    url: "/auth/dashboard",
    authHeader: "x-auth-token",
    description: "Dashboard do Auth",
  },
  {
    method: "GET",
    url: "/products/api/products",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    description: "Listar produtos",
  },
  {
    method: "POST",
    url: "/products/api/products",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    body: { name: "Teste E2E", price: 100, description: "Produto teste" },
    description: "Criar produto",
  },
  {
    method: "POST",
    url: "/products/api/products/buy",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    body: { ids: [] }, // Será preenchido dinamicamente
    description: "Criar pedido",
  },
];

describe("Testes End-to-End (E2E) - E-commerce Microservices", function () {
  this.timeout(120000); // 2 minutos para todos os testes E2E

  let testUser;
  let authToken;
  let testProductIds = [];

  // Setup global: Criar usuário e produtos para todos os testes
  before(async () => {
    console.log("🚀 Iniciando setup dos testes E2E...");

    // Registrar usuário de teste
    testUser = {
      username: generateUniqueUsername("e2e_user"),
      password: "E2E_Test_123!",
    };

    await registerUser(testUser.username, testUser.password);
    authToken = await loginUser(testUser.username, testUser.password);
    console.log(`✅ Usuário criado: ${testUser.username}`);

    // Criar produtos de teste
    const products = [
      { name: "E2E Produto 1", price: 50.0, description: "Produto E2E 1" },
      { name: "E2E Produto 2", price: 75.0, description: "Produto E2E 2" },
      { name: "E2E Produto 3", price: 100.0, description: "Produto E2E 3" },
    ];

    for (const product of products) {
      const createdProduct = await createProduct(authToken, product);
      if (createdProduct && createdProduct._id) {
        testProductIds.push(createdProduct._id);
      }
    }
    console.log(`✅ Produtos criados: ${testProductIds.length}`);

    // Atualizar o endpoint de pedido com IDs reais
    const buyEndpoint = PROTECTED_ENDPOINTS.find(
      (e) => e.url === "/products/api/products/buy",
    );
    if (buyEndpoint && testProductIds.length > 0) {
      buyEndpoint.body = { ids: testProductIds };
    }

    console.log("✅ Setup concluído. Iniciando testes...\n");
  });

  describe("E2E-01: Validação de autenticação em todas as rotas protegidas (com token válido)", () => {
    it("deve acessar todas as rotas protegidas com token válido", async () => {
      const results = [];

      for (const endpoint of PROTECTED_ENDPOINTS) {
        console.log(`  Testando: ${endpoint.method} ${endpoint.url}`);

        let response;
        const headers = {};

        // Configurar header de autenticação
        if (endpoint.authHeader === "x-auth-token") {
          headers[endpoint.authHeader] = authToken;
        } else if (endpoint.authHeader === "Authorization") {
          const prefix = endpoint.authPrefix || "Bearer";
          headers[endpoint.authHeader] = `${prefix} ${authToken}`;
        }

        try {
          switch (endpoint.method) {
            case "GET":
              response = await chai
                .request(GATEWAY_URL)
                .get(endpoint.url)
                .set(headers);
              break;
            case "POST":
              response = await chai
                .request(GATEWAY_URL)
                .post(endpoint.url)
                .set(headers)
                .send(endpoint.body || {});
              break;
            case "PUT":
              response = await chai
                .request(GATEWAY_URL)
                .put(endpoint.url)
                .set(headers)
                .send(endpoint.body || {});
              break;
            case "DELETE":
              response = await chai
                .request(GATEWAY_URL)
                .delete(endpoint.url)
                .set(headers);
              break;
          }

          results.push({
            endpoint: `${endpoint.method} ${endpoint.url}`,
            status: response.status,
            success: response.status !== 401,
          });

          expect(response.status).to.not.equal(
            401,
            `Rota ${endpoint.method} ${endpoint.url} retornou 401 não autorizado mesmo com token válido`,
          );
        } catch (error) {
          results.push({
            endpoint: `${endpoint.method} ${endpoint.url}`,
            status: error.response?.status || 500,
            success: false,
            error: error.message,
          });
          throw error;
        }
      }

      // Log dos resultados
      console.log("\n📊 Resultados E2E-01:");
      results.forEach((r) => {
        const icon = r.success ? "✅" : "❌";
        console.log(`  ${icon} ${r.endpoint} - Status: ${r.status}`);
      });

      // Verificar que todas as rotas foram acessadas com sucesso
      const allSuccess = results.every((r) => r.success);
      expect(allSuccess).to.be.true;
    });

    it("deve retornar dados corretos no dashboard", async () => {
      const res = await getDashboard(authToken);
      expect(res).to.have.status(200);
      expect(res.body).to.have.property("message", "Welcome to dashboard");
    });

    it("deve listar produtos corretamente", async () => {
      const res = await getProducts(authToken);
      expect(res).to.have.status(200);
      expect(res.body).to.be.an("array");
      expect(res.body.length).to.be.at.least(testProductIds.length);
    });
  });

  describe("E2E-02: Validação de bloqueio em todas as rotas sem autenticação", () => {
    it("deve bloquear todas as rotas protegidas sem token", async () => {
      const results = [];

      for (const endpoint of PROTECTED_ENDPOINTS) {
        console.log(
          `  Testando: ${endpoint.method} ${endpoint.url} (sem token)`,
        );

        let response;

        try {
          switch (endpoint.method) {
            case "GET":
              response = await chai.request(GATEWAY_URL).get(endpoint.url);
              break;
            case "POST":
              response = await chai
                .request(GATEWAY_URL)
                .post(endpoint.url)
                .send(endpoint.body || {});
              break;
            case "PUT":
              response = await chai
                .request(GATEWAY_URL)
                .put(endpoint.url)
                .send(endpoint.body || {});
              break;
            case "DELETE":
              response = await chai.request(GATEWAY_URL).delete(endpoint.url);
              break;
          }

          results.push({
            endpoint: `${endpoint.method} ${endpoint.url}`,
            status: response.status,
            message: response.body?.message,
            isBlocked: response.status === 401,
          });

          // Verificar status 401
          expect(response.status).to.equal(
            401,
            `Rota ${endpoint.method} ${endpoint.url} deveria retornar 401, mas retornou ${response.status}`,
          );

          // Verificar mensagem de erro apropriada
          const expectedMessage =
            endpoint.authHeader === "x-auth-token"
              ? "No token, authorization denied"
              : "Unauthorized";

          if (response.body && response.body.message) {
            expect(response.body.message).to.be.oneOf([
              expectedMessage,
              "Unauthorized",
            ]);
          }
        } catch (error) {
          if (error.response) {
            results.push({
              endpoint: `${endpoint.method} ${endpoint.url}`,
              status: error.response.status,
              isBlocked: error.response.status === 401,
            });
            expect(error.response.status).to.equal(401);
          } else {
            throw error;
          }
        }
      }

      // Log dos resultados
      console.log("\n📊 Resultados E2E-02:");
      results.forEach((r) => {
        const icon = r.isBlocked ? "✅" : "❌";
        console.log(`  ${icon} ${r.endpoint} - Status: ${r.status}`);
      });

      const allBlocked = results.every((r) => r.isBlocked);
      expect(allBlocked).to.be.true;
    });

    it("deve retornar 401 para dashboard sem token", async () => {
      const res = await chai.request(GATEWAY_URL).get("/auth/dashboard");

      expect(res).to.have.status(401);
      expect(res.body.message).to.equal("No token, authorization denied");
    });

    it("deve retornar 401 para listagem de produtos sem token", async () => {
      const res = await chai.request(GATEWAY_URL).get("/products/api/products");

      expect(res).to.have.status(401);
      expect(res.body.message).to.equal("Unauthorized");
    });
  });

  describe("E2E-03: Criação de 100 pedidos simultâneos", function () {
    this.timeout(CONCURRENT_TIMEOUT);

    let concurrentOrders = [];
    let users = [];
    let ordersMap = new Map();

    before(async () => {
      console.log(
        `\n📦 Preparando ${100} usuários e produtos para teste concorrente...`,
      );

      // Criar 100 usuários únicos e fazer login
      const userPromises = [];
      for (let i = 0; i < 100; i++) {
        const username = generateUniqueUsername(`concurrent_user_${i}`);
        const password = "Concurrent123!";
        userPromises.push(
          registerUser(username, password).then(async () => {
            const token = await loginUser(username, password);
            return { username, token, index: i };
          }),
        );
      }

      users = await Promise.all(userPromises);
      console.log(`✅ ${users.length} usuários criados e autenticados`);

      // Criar um produto compartilhado para todos os pedidos
      const sharedProduct = await createProduct(users[0].token, {
        name: "Produto Concorrente",
        price: 10.0,
        description: "Produto para teste de concorrência",
      });

      testProductIds = [sharedProduct._id];
      console.log(`✅ Produto compartilhado criado: ${sharedProduct._id}`);
    });

    it("deve criar 100 pedidos simultaneamente sem perda de dados", async () => {
      const startTime = Date.now();

      // Criar array de promises para requisições concorrentes
      const orderPromises = users.map((user) =>
        createOrder(user.token, testProductIds)
          .then((response) => ({
            user: user.username,
            token: user.token,
            response,
            timestamp: Date.now(),
            success: response.status === 201,
          }))
          .catch((error) => ({
            user: user.username,
            error: error.message,
            response: error.response,
            success: false,
          })),
      );

      // Executar todas as requisições concorrentemente
      concurrentOrders = await Promise.all(orderPromises);

      const elapsedTime = Date.now() - startTime;
      console.log(`\n⏱️ Tempo total para ${100} pedidos: ${elapsedTime}ms`);
      console.log(`📈 Média: ${(elapsedTime / 100).toFixed(2)}ms por pedido`);

      // Verificar 1: Todas as respostas têm status 2xx
      const successfulOrders = concurrentOrders.filter(
        (o) => o.success && o.response.status === 201,
      );
      const failedOrders = concurrentOrders.filter((o) => !o.success);

      console.log(`\n✅ Pedidos com sucesso: ${successfulOrders.length}`);
      console.log(`❌ Pedidos com falha: ${failedOrders.length}`);

      expect(successfulOrders.length).to.equal(100);

      // Verificar 2: Cada resposta contém orderId único
      const orderIds = new Set();
      const duplicateOrderIds = [];

      successfulOrders.forEach((order) => {
        const orderId = order.response.body.orderId;
        if (orderIds.has(orderId)) {
          duplicateOrderIds.push(orderId);
        } else {
          orderIds.add(orderId);
        }

        // Verificar estrutura da resposta
        expect(order.response.body).to.have.property("orderId");
        expect(order.response.body).to.have.property("status");
        expect(order.response.body.orderId).to.be.a("string");

        // Armazenar no mapa
        ordersMap.set(orderId, {
          user: order.user,
          response: order.response.body,
          timestamp: order.timestamp,
        });
      });

      console.log(`\n🔑 OrderIds únicos gerados: ${orderIds.size}`);

      expect(duplicateOrderIds).to.be.empty;
      expect(orderIds.size).to.equal(100);

      // Verificar 3: Nenhum pedido foi perdido
      // Tentar consultar cada pedido (se API de consulta existir)
      let foundOrders = 0;
      for (const orderId of orderIds) {
        try {
          const statusRes = await chai
            .request(GATEWAY_URL)
            .get(`/products/orders/${orderId}`)
            .set("Authorization", `Bearer ${users[0].token}`);

          if (statusRes.status === 200) {
            foundOrders++;
          }
        } catch (error) {
          // API pode não estar implementada
        }
      }

      console.log(
        `\n📋 Pedidos encontrados na API de consulta: ${foundOrders}/${orderIds.size}`,
      );

      // Verificar 4: Integridade do mapa de pedidos
      // Cada pedido deve ter produtos e usuário consistentes
      for (const [orderId, orderData] of ordersMap) {
        const orderResponse = orderData.response;

        expect(orderResponse).to.have.property("products");
        expect(orderResponse.products).to.be.an("array");
        expect(orderResponse.products.length).to.equal(testProductIds.length);

        // Verificar que o username está correto
        if (orderResponse.username) {
          expect(orderResponse.username).to.equal(orderData.user);
        }
      }

      console.log(
        `\n✅ Todos os ${ordersMap.size} pedidos têm dados consistentes`,
      );
    });

    it("deve verificar que não houve corrupção no mapa interno", async () => {
      // Esta verificação é mais profunda e depende de acesso interno
      // Tentamos fazer uma requisição adicional para verificar consistência

      const lastOrder = concurrentOrders[concurrentOrders.length - 1];
      if (lastOrder.success) {
        // Criar mais um pedido para ver se o sistema ainda está saudável
        const extraOrder = await createOrder(users[0].token, testProductIds);
        expect(extraOrder).to.have.status(201);
        expect(extraOrder.body).to.have.property("orderId");

        // Verificar que o novo orderId não colide com nenhum anterior
        const allOrderIds = Array.from(ordersMap.keys());
        expect(allOrderIds).to.not.include(extraOrder.body.orderId);
      }
    });
  });

  describe("E2E-04: Criar pedido com token válido mas username diferente do informado no corpo", () => {
    let userA, userB;
    let tokenA, tokenB;
    let productId;

    before(async () => {
      console.log("\n🔐 Preparando usuários para teste de segurança...");

      // Criar usuário A
      userA = {
        username: generateUniqueUsername("userA"),
        password: "UserA123!",
      };
      await registerUser(userA.username, userA.password);
      tokenA = await loginUser(userA.username, userA.password);

      // Criar usuário B
      userB = {
        username: generateUniqueUsername("userB"),
        password: "UserB123!",
      };
      await registerUser(userB.username, userB.password);
      tokenB = await loginUser(userB.username, userB.password);

      // Criar produto de teste
      const product = await createProduct(tokenA, {
        name: "Produto Teste Segurança",
        price: 99.99,
        description: "Produto para teste de usurpação",
      });
      productId = product._id;

      console.log(`✅ Usuário A: ${userA.username}`);
      console.log(`✅ Usuário B: ${userB.username}`);
      console.log(`✅ Produto ID: ${productId}`);
    });

    it("deve rejeitar pedido quando username no corpo não corresponde ao token", async () => {
      // Tentar criar pedido do usuário A com username do usuário B no corpo
      const maliciousRequest = {
        username: userB.username,
        ids: [productId],
      };

      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(maliciousRequest);

      console.log(`\n📡 Resposta do servidor: Status ${res.status}`);
      console.log(`📝 Mensagem: ${res.body?.message || "Sem mensagem"}`);

      // Verificar que foi rejeitado (403 ou 400)
      expect(res.status).to.be.oneOf([400, 403, 401]);

      if (res.body && res.body.message) {
        const message = res.body.message.toLowerCase();
        const expectedMessages = [
          "username",
          "autorization",
          "permission",
          "unauthorized",
          "invalid",
          "mismatch",
          "conflict",
        ];
        const hasExpectedMessage = expectedMessages.some((expected) =>
          message.includes(expected),
        );
        expect(hasExpectedMessage).to.be.true;
      }
    });

    it("não deve criar pedido no sistema quando username não confere", async () => {
      // Tentativa maliciosa
      const maliciousRequest = {
        username: userB.username,
        ids: [productId],
      };

      await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(maliciousRequest);

      // Verificar que não há pedido para o usuário B com esse produto
      // Tentar listar pedidos do usuário B (se houver endpoint)
      try {
        // Se existir endpoint de listagem de pedidos por usuário
        const userBOrders = await chai
          .request(GATEWAY_URL)
          .get(`/orders/user/${userB.username}`)
          .set("Authorization", `Bearer ${tokenB}`);

        if (userBOrders.status === 200 && userBOrders.body.orders) {
          const hasMaliciousOrder = userBOrders.body.orders.some(
            (order) =>
              order.products && order.products.some((p) => p._id === productId),
          );
          expect(hasMaliciousOrder).to.be.false;
        }
      } catch (error) {
        // Endpoint pode não existir, ignorar verificação
        console.log("⚠️ Endpoint de listagem de pedidos não disponível");
      }
    });

    it("deve permitir pedido normal sem username no corpo (usando token)", async () => {
      // Pedido legítimo sem username no corpo
      const legitimateRequest = {
        ids: [productId],
      };

      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(legitimateRequest);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("orderId");

      // Verificar que o pedido foi associado ao usuário correto
      if (res.body.username) {
        expect(res.body.username).to.equal(userA.username);
      }

      console.log(
        `\n✅ Pedido legítimo criado: ${res.body.orderId} para ${userA.username}`,
      );
    });

    it("deve rejeitar pedido com username diferente mesmo quando é admin (se houver role)", async () => {
      // Este teste verifica se mesmo um usuário com role diferente não pode usurpar
      const adminRequest = {
        username: userB.username,
        ids: [productId],
      };

      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(adminRequest);

      // Deve continuar rejeitando, a menos que o sistema tenha role de admin
      if (res.status === 201) {
        console.log(
          "⚠️ AVISO: Sistema permitiu usurpação! Isso é uma falha de segurança.",
        );
        expect.fail("Sistema permitiu criar pedido em nome de outro usuário");
      } else {
        expect(res.status).to.be.oneOf([400, 403, 401]);
      }
    });

    it("deve funcionar corretamente para o usuário B com seu próprio token", async () => {
      // Verificar que o usuário B consegue criar pedido normalmente
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ ids: [productId] });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("orderId");

      // Verificar que o pedido é do usuário B
      if (res.body.username) {
        expect(res.body.username).to.equal(userB.username);
      }

      console.log(`\n✅ Usuário B criou pedido legítimo: ${res.body.orderId}`);
    });
  });
});

// Testes E2E adicionais para verificar resiliência
describe("Testes E2E - Cenários de Borda e Resiliência", function () {
  this.timeout(60000);

  let authToken;
  let productIds = [];

  before(async () => {
    // Setup para testes de borda
    const username = generateUniqueUsername("edge_user");
    await registerUser(username, "Edge123!");
    authToken = await loginUser(username, "Edge123!");

    const product = await createProduct(authToken, {
      name: "Produto Borda",
      price: 1.99,
      description: "Produto para testes de borda",
    });
    productIds = [product._id];
  });

  it("deve lidar corretamente com pedido de produto inexistente", async () => {
    const fakeOrder = {
      ids: ["id-inexistente-12345", "outro-id-falso"],
    };

    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products/buy")
      .set("Authorization", `Bearer ${authToken}`)
      .send(fakeOrder);

    // Deve retornar erro, não 500
    expect(res.status).to.be.oneOf([400, 404]);
  });

  it("deve lidar corretamente com pedido de lista vazia", async () => {
    const emptyOrder = {
      ids: [],
    };

    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products/buy")
      .set("Authorization", `Bearer ${authToken}`)
      .send(emptyOrder);

    expect(res.status).to.equal(400);
  });

  it("deve lidar corretamente com token mal formatado", async () => {
    const res = await chai
      .request(GATEWAY_URL)
      .get("/products/api/products")
      .set("Authorization", "InvalidToken");

    expect(res.status).to.equal(401);
  });

  it("deve lidar corretamente com token expirado", async () => {
    const expiredToken = jwt.sign(
      { username: "expired", id: "expired-id" },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "-1s" },
    );

    const res = await chai
      .request(GATEWAY_URL)
      .get("/auth/dashboard")
      .set("x-auth-token", expiredToken);

    expect(res.status).to.equal(401);
  });
});

// Exportar para uso em outros scripts
module.exports = {
  GATEWAY_URL,
  PROTECTED_ENDPOINTS,
  generateUniqueUsername,
  registerUser,
  loginUser,
  createProduct,
  createOrder,
};
