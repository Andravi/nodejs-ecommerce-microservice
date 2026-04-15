// const { expect } = require("chai");
// const Product = require("../../src/models/product");

// describe("Product Model Unit Tests", () => {
//   it("UT-05: deve falhar na validação se campos obrigatórios faltarem", () => {
//     const prod = new Product({});
//     const err = prod.validateSync();

//     expect(err.errors.name).to.exist;
//     expect(err.errors.price).to.exist;
//   });

//   it("UT-06: deve rejeitar preço negativo", () => {
//     const prod = new Product({ name: "Teste", price: -10 });
//     const err = prod.validateSync();

//     expect(err.errors.price.message).to.contain("preço não pode ser negativo");
//   });
// });
