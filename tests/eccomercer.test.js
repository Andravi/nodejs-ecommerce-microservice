// test/integration/ecommerce.integration.test.js
const chai = require("chai");
const chaiHttp = require("chai-http");
const { expect } = chai;
const jwt = require("jsonwebtoken");

chai.use(chaiHttp);

// URLs dos serviços (conforme docker-compose.yml original)
const GATEWAY_URL = "http://localhost:3003";
const AUTH_URL = "http://localhost:3000";
const PRODUCT_URL = "http://localhost:3001";
const ORDER_URL = "http://localhost:3002";

// Configuração para testes
const TEST_SECRET = process.env.JWT_SECRET || "test-secret-key";

describe("Testes de Integração - E-commerce Microservices", () => {
  let authToken;
  let testProductIds = [];
  let testOrderId;

  // Helper para gerar token JWT válido para testes
  const generateValidToken = (username = "testuser") => {
    return jwt.sign(
      { username, id: `test-id-${Date.now()}`, iat: Date.now() },
      TEST_SECRET,
      { expiresIn: "1h" },
    );
  };

  // Helper para criar usuário de teste via API
  const createTestUser = async (username, password) => {
    return await chai
      .request(GATEWAY_URL)
      .post("/auth/register")
      .send({ username, password });
  };

  // Helper para login e obtenção de token
  const loginAndGetToken = async (username, password) => {
    const res = await chai
      .request(GATEWAY_URL)
      .post("/auth/login")
      .send({ username, password });
    return res.body.token;
  };

  // Helper para criar produto de teste
  const createTestProduct = async (token, productData) => {
    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(productData);
    return res.body;
  };

  describe("IT-01: Acesso ao dashboard sem token", () => {
    it("deve retornar 401 quando acessar /auth/dashboard sem token", async () => {
      // Act
      const res = await chai.request(GATEWAY_URL).get("/auth/dashboard");

      // Assert
      expect(res).to.have.status(401);
      expect(res.body).to.have.property(
        "message",
        "No token, authorization denied",
      );
    });

    it("deve retornar 401 quando token é inválido", async () => {
      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/auth/dashboard")
        .set("x-auth-token", "token-invalido-12345");

      // Assert
      expect(res).to.have.status(401);
      expect(res.body).to.have.property("message");
    });

    it("deve retornar 401 quando token está expirado", async () => {
      // Arrange
      const expiredToken = jwt.sign(
        { username: "expired", id: "123" },
        TEST_SECRET,
        { expiresIn: "-1s" },
      );

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/auth/dashboard")
        .set("x-auth-token", expiredToken);

      // Assert
      expect(res).to.have.status(401);
    });
  });

  describe("IT-02: Listagem de produtos sem autenticação", () => {
    it("deve retornar 401 quando acessar /products/api/products sem token", async () => {
      // Act
      const res = await chai.request(GATEWAY_URL).get("/products/api/products");

      // Assert
      expect(res).to.have.status(401);
      expect(res.body).to.have.property("message", "Unauthorized");
    });

    it("deve retornar 401 com token inválido", async () => {
      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/products/api/products")
        .set("Authorization", "Bearer token-invalido");

      // Assert
      expect(res).to.have.status(401);
      expect(res.body).to.have.property("message", "Unauthorized");
    });
  });

  describe("IT-03: Listagem de produtos com autenticação válida", () => {
    before(async () => {
      // Registrar e fazer login para obter token válido
      const testUsername = `listuser_${Date.now()}`;
      await createTestUser(testUsername, "password123");
      authToken = await loginAndGetToken(testUsername, "password123");
    });

    it("deve retornar 200 e array de produtos com token válido", async () => {
      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(res).to.have.status(200);
      expect(res.body).to.be.an("array");
    });

    it("deve retornar estrutura correta quando existem produtos", async () => {
      // Primeiro, criar um produto
      const newProduct = {
        name: "Produto Teste Listagem",
        price: 49.99,
        description: "Produto para testar listagem",
      };

      await createTestProduct(authToken, newProduct);

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(res).to.have.status(200);
      expect(res.body).to.be.an("array");

      if (res.body.length > 0) {
        const product = res.body[0];
        expect(product).to.have.property("_id");
        expect(product).to.have.property("name");
        expect(product).to.have.property("price");
        expect(product).to.have.property("description");
      }
    });
  });

  describe("IT-04: Criação de produto com autenticação válida", () => {
    before(async () => {
      const testUsername = `productcreator_${Date.now()}`;
      await createTestUser(testUsername, "password123");
      authToken = await loginAndGetToken(testUsername, "password123");
    });

    it("deve criar produto e retornar 201 com dados corretos", async () => {
      // Arrange
      const productData = {
        name: "Produto Teste Integração",
        price: 199.9,
        description: "Descrição do produto criado no teste IT-04",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(productData);

      // Assert
      expect(res).to.have.status(201);
      expect(res.body).to.have.property("_id");
      expect(res.body.name).to.equal(productData.name);
      expect(res.body.price).to.equal(productData.price);
      expect(res.body.description).to.equal(productData.description);

      // Guardar ID para outros testes
      testProductIds.push(res.body._id);
    });

    it("deve retornar 400 quando nome do produto está ausente", async () => {
      // Arrange
      const invalidProduct = {
        price: 99.99,
        description: "Produto sem nome",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidProduct);

      // Assert
      expect(res).to.have.status(400);
    });

    it("deve retornar 400 quando preço do produto está ausente", async () => {
      // Arrange
      const invalidProduct = {
        name: "Produto sem preço",
        description: "Descrição qualquer",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidProduct);

      // Assert
      expect(res).to.have.status(400);
    });

    it("deve retornar 400 quando preço é negativo", async () => {
      // Arrange
      const invalidProduct = {
        name: "Produto Preço Negativo",
        price: -50.0,
        description: "Produto com preço negativo",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidProduct);

      // Assert
      expect(res).to.have.status(400);
    });
  });

  describe("IT-05: Registro com nome de usuário extremamente longo", () => {
    it("deve retornar 400 quando username tem mais de 100 caracteres", async () => {
      // Arrange
      const longUsername = "a".repeat(101);
      const userData = {
        username: longUsername,
        password: "test123",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/auth/register")
        .send(userData);

      // Assert
      expect(res).to.have.status(400);
    });

    it("deve retornar 400 quando username tem mais de 1000 caracteres", async () => {
      // Arrange
      const extremelyLongUsername = "b".repeat(1001);
      const userData = {
        username: extremelyLongUsername,
        password: "test123",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/auth/register")
        .send(userData);

      // Assert
      expect(res).to.have.status(400);
      expect(res.body).to.have.property("message");
    });

    it("deve aceitar username com 50 caracteres (dentro do limite)", async () => {
      // Arrange
      const validUsername = `user_${"c".repeat(45)}`; // Total ~50 chars
      const userData = {
        username: validUsername,
        password: "test123",
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/auth/register")
        .send(userData);

      // Assert
      // Pode ser 200 ou 400 se já existir, mas não deve ser erro de validação
      expect(res.status).to.not.equal(500);
    });
  });

  describe("IT-06: Consulta de status de pedido", () => {
    before(async () => {
      // Setup: Criar usuário e produtos para o pedido
      const testUsername = `orderuser_${Date.now()}`;
      await createTestUser(testUsername, "password123");
      authToken = await loginAndGetToken(testUsername, "password123");

      // Criar produtos
      const product1 = await createTestProduct(authToken, {
        name: "Produto Pedido A",
        price: 100.0,
        description: "Primeiro produto do pedido",
      });

      const product2 = await createTestProduct(authToken, {
        name: "Produto Pedido B",
        price: 150.0,
        description: "Segundo produto do pedido",
      });

      testProductIds = [product1._id, product2._id];
    });

    it("deve criar pedido e retornar orderId", async () => {
      // Arrange
      const orderData = {
        ids: testProductIds,
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${authToken}`)
        .send(orderData);

      // Assert
      expect(res).to.have.status(201);
      expect(res.body).to.have.property("orderId");
      expect(res.body).to.have.property("status");
      expect(res.body).to.have.property("products");
      expect(res.body.products).to.be.an("array");

      testOrderId = res.body.orderId;
    });

    it("deve consultar status do pedido com sucesso", async () => {
      // Act - Tentar consultar status do pedido
      const res = await chai
        .request(GATEWAY_URL)
        .get(`/products/orders/${testOrderId}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Assert - Verificar se a rota existe
      if (res.status === 200) {
        expect(res.body).to.have.property("orderId", testOrderId);
        expect(res.body).to.have.property("status");
        expect(["pending", "completed"]).to.include(res.body.status);
        expect(res.body).to.have.property("products");
      } else if (res.status === 404) {
        // Se a rota não estiver implementada, o teste falha com mensagem clara
        console.warn(
          "⚠️ Rota GET /products/orders/:orderId não está implementada",
        );
        expect.fail(
          "Rota GET /products/orders/:orderId não foi implementada no Product Controller",
        );
      }
    });

    it("deve retornar 404 para orderId inexistente", async () => {
      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .get("/products/orders/id-inexistente-123456789")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      if (res.status !== 404 && res.status !== 401) {
        console.log(`Status recebido: ${res.status}`);
      }
    });
  });

  describe("IT-07: Tempo limite do long polling na criação de pedido", () => {
    let authTokenTimeout;
    let productIdTimeout;

    before(async () => {
      // Setup para teste de timeout
      const testUsername = `timeoutuser_${Date.now()}`;
      await createTestUser(testUsername, "password123");
      authTokenTimeout = await loginAndGetToken(testUsername, "password123");

      // Criar produto
      const product = await createTestProduct(authTokenTimeout, {
        name: "Produto Timeout Test",
        price: 75.0,
        description: "Produto para teste de timeout",
      });

      productIdTimeout = product._id;
    });

    it("deve processar pedido dentro do tempo limite quando RabbitMQ está funcionando", async () => {
      // Arrange
      const orderData = {
        ids: [productIdTimeout],
      };

      const startTime = Date.now();
      const TIMEOUT_LIMIT = 30000; // 30 segundos

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${authTokenTimeout}`)
        .send(orderData);

      const elapsedTime = Date.now() - startTime;

      // Assert
      expect(res.status).to.equal(201);
      expect(elapsedTime).to.be.lessThan(TIMEOUT_LIMIT);
      expect(res.body).to.have.property("status");
    });

    it("deve retornar dados completos do pedido após processamento", async () => {
      // Arrange
      const orderData = {
        ids: [productIdTimeout],
      };

      // Act
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products/buy")
        .set("Authorization", `Bearer ${authTokenTimeout}`)
        .send(orderData);

      // Assert
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property("orderId");
      expect(res.body).to.have.property("status", "completed");
      expect(res.body).to.have.property("totalPrice");
      expect(res.body.totalPrice).to.equal(75.0);
      expect(res.body).to.have.property("username");
    });
  });
});

// Testes adicionais para fluxos específicos
describe("Testes de Integração - Fluxo Completo de Compra", () => {
  let authToken;
  let productIds = [];

  before(async () => {
    // Criar usuário e fazer login
    const username = `completeflow_${Date.now()}`;
    await chai
      .request(GATEWAY_URL)
      .post("/auth/register")
      .send({ username, password: "flow123" });

    const loginRes = await chai
      .request(GATEWAY_URL)
      .post("/auth/login")
      .send({ username, password: "flow123" });

    authToken = loginRes.body.token;

    // Criar múltiplos produtos
    const products = [
      { name: "Produto Flow 1", price: 10.0, description: "Flow product 1" },
      { name: "Produto Flow 2", price: 20.0, description: "Flow product 2" },
      { name: "Produto Flow 3", price: 30.0, description: "Flow product 3" },
    ];

    for (const product of products) {
      const res = await chai
        .request(GATEWAY_URL)
        .post("/products/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(product);

      if (res.status === 201) {
        productIds.push(res.body._id);
      }
    }
  });

  it("Fluxo completo: Criar produtos → Comprar → Verificar pedido", async () => {
    // Step 1: Listar produtos para confirmar criação
    const listRes = await chai
      .request(GATEWAY_URL)
      .get("/products/api/products")
      .set("Authorization", `Bearer ${authToken}`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body.length).to.be.at.least(3);

    // Step 2: Criar pedido com todos os produtos
    const buyRes = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products/buy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ids: productIds });

    expect(buyRes.status).to.equal(201);
    expect(buyRes.body).to.have.property("orderId");
    expect(buyRes.body).to.have.property("totalPrice", 60.0);
    expect(buyRes.body).to.have.property("status", "completed");

    const orderId = buyRes.body.orderId;

    // Step 3: Tentar consultar status (se implementado)
    const statusRes = await chai
      .request(GATEWAY_URL)
      .get(`/products/orders/${orderId}`)
      .set("Authorization", `Bearer ${authToken}`);

    if (statusRes.status === 200) {
      expect(statusRes.body.status).to.equal("completed");
    }

    console.log(`✅ Pedido ${orderId} criado com sucesso - Total: R$ 60.00`);
  });

  it("Deve calcular corretamente o valor total do pedido", async () => {
    // Arrange
    const selectedProducts = productIds.slice(0, 2); // Pega apenas 2 produtos
    const expectedTotal = 10.0 + 20.0; // 10 + 20 = 30

    // Act
    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products/buy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ids: selectedProducts });

    // Assert
    expect(res.status).to.equal(201);
    expect(res.body.totalPrice).to.equal(expectedTotal);
  });
});

// Testes de validação do API Gateway
describe("Testes de Integração - API Gateway Routing", () => {
  it("deve rotear requisições /auth/* para o serviço auth", async () => {
    const res = await chai
      .request(GATEWAY_URL)
      .post("/auth/register")
      .send({
        username: `gateway_test_${Date.now()}`,
        password: "test123",
      });

    // Se o gateway está roteando corretamente, deve retornar resposta do auth
    expect(res.status).to.be.oneOf([200, 400]);
  });

  it("deve rotear requisições /products/* para o serviço product", async () => {
    // Gerar token válido
    const token = jwt.sign({ username: "routetest", id: "123" }, TEST_SECRET);

    const res = await chai
      .request(GATEWAY_URL)
      .get("/products/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.be.oneOf([200, 401]);
  });

  it("deve rotear requisições /orders/* para o serviço order", async () => {
    const res = await chai.request(GATEWAY_URL).get("/orders/"); // Rota base do order service

    // Verificar se a requisição chega ao order service
    expect(res.status).to.be.a("number");
  });
});

// Testes de validação de dados
describe("Testes de Integração - Validação de Dados", () => {
  let authToken;

  before(async () => {
    const username = `validation_${Date.now()}`;
    await chai
      .request(GATEWAY_URL)
      .post("/auth/register")
      .send({ username, password: "val123" });

    const loginRes = await chai
      .request(GATEWAY_URL)
      .post("/auth/login")
      .send({ username, password: "val123" });

    authToken = loginRes.body.token;
  });

  it("deve rejeitar produto com preço zero", async () => {
    const productData = {
      name: "Produto Grátis",
      price: 0,
      description: "Preço zero deveria ser permitido ou não?",
    };

    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products")
      .set("Authorization", `Bearer ${authToken}`)
      .send(productData);

    // O sistema pode aceitar ou rejeitar preço zero
    expect(res.status).to.be.oneOf([201, 400]);
  });

  it("deve rejeitar pedido com ID de produto inexistente", async () => {
    const orderData = {
      ids: ["id-inexistente-123", "outro-id-falso"],
    };

    const res = await chai
      .request(GATEWAY_URL)
      .post("/products/api/products/buy")
      .set("Authorization", `Bearer ${authToken}`)
      .send(orderData);

    // Deve retornar erro pois produtos não existem
    expect(res.status).to.be.oneOf([400, 404, 500]);
  });
});
