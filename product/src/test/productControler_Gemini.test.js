const { expect } = require("chai");
const sinon = require("sinon");
const ProductController = require("../../src/controllers/productController");
const Product = require("../../src/models/product");

describe("Product Controller & Orders Logic", () => {
  let productController;
  let req, res;

  beforeEach(() => {
    productController = new ProductController();
    res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
  });

  it("UT-07: deve retornar 400 se a lista de IDs de produtos estiver vazia", async () => {
    req = {
      headers: { authorization: "Bearer token" },
      body: { ids: [] },
    };

    await productController.createOrder(req, res);
    // Se falhar aqui, indica que falta a validação "if (ids.length === 0)" no controller
    expect(res.status.calledWith(400)).to.be.true;
  });

  it("UT-09 & UT-10: Verificação de UUID e Map Interno", async () => {
    // Stub do banco para não tentar conectar de verdade
    sinon.stub(Product, "find").resolves([{ _id: "1", price: 10 }]);

    req = {
      headers: { authorization: "Bearer token" },
      body: { ids: ["1"] },
      user: { username: "testuser" },
    };

    // Chamada (não aguardamos o long polling aqui, pois o teste travaria)
    // Em um teste real, você mockaria o MessageBroker para responder imediatamente
    const promise = productController.createOrder(req, res);

    // UT-10: Verificar se foi pro Map
    expect(productController.ordersMap.size).to.equal(1);
    const orderId = Array.from(productController.ordersMap.keys())[0];

    // UT-09: Validar formato do ID gerado
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(orderId).to.match(uuidRegex);

    Product.find.restore();
  });
});
