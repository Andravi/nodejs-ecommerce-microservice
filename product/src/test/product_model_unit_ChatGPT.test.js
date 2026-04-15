const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const chai = require("chai");
const expect = chai.expect;

const Product = require("../../src/models/product");

describe("Product Model Tests", () => {
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // UT-05
  it("UT-05: Deve falhar ao criar produto sem nome e preço", async () => {
    const product = new Product({});

    try {
      await product.validate();
    } catch (err) {
      expect(err.name).to.equal("ValidationError");
      expect(err.errors.name).to.exist;
      expect(err.errors.price).to.exist;
    }
  });

  // UT-06
  it("UT-06: Deve falhar com preço negativo", async () => {
    const product = new Product({
      name: "Produto Teste",
      price: -10,
    });

    try {
      await product.validate();
    } catch (err) {
      expect(err.name).to.equal("ValidationError");
      expect(err.errors.price).to.exist;
    }
  });
});
