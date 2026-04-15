const chai = require("chai");
const sinon = require("sinon");
const expect = chai.expect;

const ProductController = require("../../src/controllers/productController");

describe("ProductController Unit Tests", () => {
  let controller;
  let req;
  let res;

  beforeEach(() => {
    controller = new ProductController();

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
  });

  // UT-07
  it("UT-07: Deve falhar ao criar pedido com lista vazia", async () => {
    req = {
      body: { ids: [] },
      headers: { authorization: "Bearer token" },
      user: { username: "joao" },
    };

    await controller.createOrder(req, res);

    expect(res.status.calledWith(400)).to.be.true;
  });

  // UT-09
  it("UT-09: Deve gerar UUIDs diferentes", () => {
    const uuid = require("uuid");

    const id1 = uuid.v4();
    const id2 = uuid.v4();

    expect(id1).to.not.equal(id2);
    expect(id1).to.match(/^[0-9a-fA-F-]{36}$/);
  });

  // UT-10
  it("UT-10: Deve armazenar pedido no Map", async () => {
    const fakeProducts = [{ _id: "1", price: 10 }];

    sinon.stub(require("../../src/models/product"), "find").resolves(fakeProducts);

    sinon
      .stub(require("../../src/utils/messageBroker"), "publishMessage")
      .resolves();

    sinon.stub(require("../../src/utils/messageBroker"), "consumeMessage");

    req = {
      body: { ids: ["1"] },
      headers: { authorization: "Bearer token" },
      user: { username: "joao" },
    };

    await controller.createOrder(req, res);

    const entries = Array.from(controller.ordersMap.entries());

    expect(entries.length).to.be.greaterThan(0);

    const [orderId, order] = entries[0];

    expect(order.status).to.equal("pending");
    expect(order.username).to.equal("joao");

    require("../src/models/product").find.restore();
  });
});
