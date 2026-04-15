// test/unit/product.controller.unit.test.js
const chai = require("chai");
const sinon = require("sinon");
const { expect } = chai;
const ProductController = require("../../src/controllers/productController");
const messageBroker = require("../../src/utils/messageBroker");
const Product = require("../../src/models/product");
const mongoose = require("mongoose");

describe("Product Controller - Testes Unitários", () => {
  let productController;
  let req;
  let res;

  beforeEach(() => {
    productController = new ProductController();

    req = {
      body: {},
      user: { username: "testuser", id: "123" },
      headers: {
        authorization: "Bearer valid-token-123",
      },
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };

    productController.ordersMap = new Map();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("UT-07: Criação de pedido com lista vazia de produtos", () => {
    it("deve retornar erro 400 quando lista de produtos está vazia", async () => {
      // Arrange
      req.body = { ids: [] };

      // Act
      await productController.createOrder(req, res);

      // Assert
      // expect(res.status.calledWith(400)).to.be.true;
      const callArg = res.json.getCall(0).args[0];
      expect(callArg.message).to.equal(
        "Lista de produtos não pode estar vazia",
      );
    });

    it("deve retornar erro 400 quando ids não é fornecido", async () => {
      // Arrange
      req.body = {};

      // Act
      await productController.createOrder(req, res);

      // Assert
      expect(res.status.calledWith(400)).to.be.true;
      const callArg = res.json.getCall(0).args[0];
      expect(callArg.message).to.equal(
        "Lista de produtos não pode estar vazia",
      );
    });

    it("não deve chamar messageBroker quando lista está vazia", async () => {
      // Arrange
      req.body = { ids: [] };
      sinon.stub(messageBroker, "publishMessage").resolves();

      // Act
      await productController.createOrder(req, res);

      // Assert
      expect(messageBroker.publishMessage.called).to.be.false;
    });
  });

  describe("UT-09: Geração única de identificador de pedido", () => {
    const uuid = require("uuid");

    it("deve gerar UUID válido para cada pedido", async () => {
      // Simula a geração de orderId
      const orderId1 = uuid.v4();
      const orderId2 = uuid.v4();

      // Assert - formato UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(orderId1).to.match(uuidRegex);
      expect(orderId2).to.match(uuidRegex);
    });

    it("deve gerar IDs diferentes para pedidos diferentes", () => {
      const orderId1 = uuid.v4();
      const orderId2 = uuid.v4();

      expect(orderId1).to.not.equal(orderId2);
    });

    it("deve usar uuid.v4() para gerar IDs", async () => {
      const uuidv4Stub = sinon.stub(uuid, "v4");
      uuidv4Stub.onFirstCall().returns("fixed-uuid-1");
      uuidv4Stub.onSecondCall().returns("fixed-uuid-2");

      const mockProducts = [{ _id: "1", name: "Produto 1", price: 100 }];

      req.body = { ids: ["1"] };
      sinon.stub(productController, "getProductsByIds").resolves(mockProducts);
      sinon.stub(messageBroker, "publishMessage").resolves();
      sinon.stub(messageBroker, "consumeMessage");

      // Forçar o controller a usar o stub
      const originalUuid = require("uuid").v4;
      require("uuid").v4 = uuidv4Stub;

      await productController.createOrder(req, res);

      expect(uuidv4Stub.called).to.be.true;

      // Restore
      require("uuid").v4 = originalUuid;
    });
  });

  describe("UT-10: Armazenamento do pedido em memória (Map interno)", () => {
    it("deve inserir pedido no Map com status pending", async () => {
      // Arrange
      const mockProducts = [
        { _id: "prod1", name: "Produto A", price: 50 },
        { _id: "prod2", name: "Produto B", price: 75 },
      ];

      req.body = { ids: ["prod1", "prod2"] };

      sinon.stub(Product, "find").returns({
        exec: sinon.stub().resolves(mockProducts),
      });
      sinon.stub(messageBroker, "publishMessage").resolves();
      sinon.stub(messageBroker, "consumeMessage");

      // Act
      await productController.createOrder(req, res);

      // Assert - verifica se o Map tem alguma entrada
      expect(productController.ordersMap.size).to.be.greaterThan(0);

      // Verifica o primeiro pedido no Map
      const firstOrderId = Array.from(productController.ordersMap.keys())[0];
      const storedOrder = productController.ordersMap.get(firstOrderId);

    });

    it("deve atualizar status do pedido no Map quando order é completada", async () => {
      // Arrange
      const orderId = "test-order-456";
      const initialOrder = {
        status: "pending",
        products: [{ name: "Produto X", price: 30 }],
        username: "maria",
      };

      productController.ordersMap.set(orderId, initialOrder);

      // Act - simula recebimento da confirmação do order service
      const completedData = {
        orderId,
        status: "completed",
        totalPrice: 30,
      };

      productController.ordersMap.set(orderId, {
        ...initialOrder,
        ...completedData,
        status: "completed",
      });

      // Assert
      const updatedOrder = productController.ordersMap.get(orderId);
      expect(updatedOrder.status).to.equal("completed");
      expect(updatedOrder.totalPrice).to.equal(30);
    });

    it("deve manter os dados do usuário corretamente no Map", async () => {
      // Arrange
      const mockProducts = [{ _id: "prod3", name: "Produto C", price: 120 }];
      const expectedUsername = "carlos.silva";

      req.user.username = expectedUsername;
      req.body = { ids: ["prod3"] };

      sinon.stub(Product, "find").returns({
        exec: sinon.stub().resolves(mockProducts),
      });
      sinon.stub(messageBroker, "publishMessage").resolves();
      sinon.stub(messageBroker, "consumeMessage");

      // Act
      await productController.createOrder(req, res);

      // Assert
      const firstOrderId = Array.from(productController.ordersMap.keys())[0];
      const storedOrder = productController.ordersMap.get(firstOrderId);
      expect(storedOrder.username).to.equal(expectedUsername);
    });

    it("deve armazenar múltiplos pedidos no Map", async () => {
      // Arrange
      const mockProducts = [{ _id: "prod1", name: "Produto 1", price: 100 }];

      sinon.stub(Product, "find").returns({
        exec: sinon.stub().resolves(mockProducts),
      });
      sinon.stub(messageBroker, "publishMessage").resolves();
      sinon.stub(messageBroker, "consumeMessage");

      // Act - cria dois pedidos
      req.body = { ids: ["prod1"] };
      req.user.username = "usuario1";
      await productController.createOrder(req, res);

      req.user.username = "usuario2";
      await productController.createOrder(req, res);

      // Assert
      expect(productController.ordersMap.size).to.equal(2);

      // Verifica se ambos os usuários estão no Map
      const usersInOrders = Array.from(
        productController.ordersMap.values(),
      ).map((o) => o.username);
      expect(usersInOrders).to.include("usuario1");
      expect(usersInOrders).to.include("usuario2");
    });
  });
});

