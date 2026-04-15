// const chai = require("chai");
// const sinon = require("sinon");
// const { expect } = chai;
// const AuthController = require("../../src/controllers/authController");
// const AuthService = require("../../src/services/authService");

// describe("UT-01: Registro de usuário com campos obrigatórios ausentes", () => {
//   let authController;
//   let mockAuthService;
//   let req;
//   let res;

//   beforeEach(() => {
//     mockAuthService = sinon.createStubInstance(AuthService);
//     authController = new AuthController(mockAuthService);

//     req = {
//       body: {},
//     };

//     res = {
//       status: sinon.stub().returnsThis(),
//       json: sinon.stub().returnsThis(),
//     };
//   });

//   it("deve retornar erro 400 quando username está ausente", async () => {
//     // Arrange
//     req.body = { password: "123456" };

//     // Act
//     await authController.register(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith(sinon.match.has("message"))).to.be.true;

//     // Verifica se a mensagem indica erro de validação
//     const callArg = res.json.getCall(0).args[0];
//     expect(callArg.message).to.include("username");
//   });

//   it("deve retornar erro 400 quando password está ausente", async () => {
//     // Arrange
//     req.body = { username: "testuser" };

//     // Act
//     await authController.register(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith(sinon.match.has("message"))).to.be.true;

//     const callArg = res.json.getCall(0).args[0];
//     expect(callArg.message).to.include("password");
//   });

//   it("deve retornar erro 400 quando ambos campos estão ausentes", async () => {
//     // Arrange
//     req.body = {};

//     // Act
//     await authController.register(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//   });
// });

// describe("UT-02: Registro com nome de usuário duplicado", () => {
//   let authController;
//   let mockAuthService;
//   let req;
//   let res;

//   beforeEach(() => {
//     mockAuthService = sinon.createStubInstance(AuthService);
//     authController = new AuthController(mockAuthService);

//     req = {
//       body: {
//         username: "duplicado",
//         password: "qualquer123",
//       },
//     };

//     res = {
//       status: sinon.stub().returnsThis(),
//       json: sinon.stub().returnsThis(),
//     };
//   });

//   it("deve retornar erro 400 quando username já existe", async () => {
//     // Arrange
//     const existingUser = { username: "duplicado", password: "hashed" };
//     mockAuthService.findUserByUsername.resolves(existingUser);

//     // Act
//     await authController.register(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith({ message: "Username already taken" })).to.be
//       .true;
//   });

//   it("não deve chamar register do service quando usuário já existe", async () => {
//     // Arrange
//     const existingUser = { username: "duplicado", password: "hashed" };
//     mockAuthService.findUserByUsername.resolves(existingUser);
//     mockAuthService.register.resolves({});

//     // Act
//     await authController.register(req, res);

//     // Assert
//     expect(mockAuthService.register.called).to.be.false;
//   });
// });

// describe("UT-03: Login com senha incorreta", () => {
//   let authController;
//   let mockAuthService;
//   let req;
//   let res;

//   beforeEach(() => {
//     mockAuthService = sinon.createStubInstance(AuthService);
//     authController = new AuthController(mockAuthService);

//     req = {
//       body: {
//         username: "joao",
//         password: "errada",
//       },
//     };

//     res = {
//       status: sinon.stub().returnsThis(),
//       json: sinon.stub().returnsThis(),
//     };
//   });

//   it("deve retornar erro 400 quando senha está incorreta", async () => {
//     // Arrange
//     mockAuthService.login.resolves({
//       success: false,
//       message: "Invalid username or password",
//     });

//     // Act
//     await authController.login(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith({ message: "Invalid username or password" })).to
//       .be.true;
//   });

//   it("não deve retornar token quando senha está incorreta", async () => {
//     // Arrange
//     mockAuthService.login.resolves({
//       success: false,
//       message: "Invalid username or password",
//     });

//     // Act
//     await authController.login(req, res);

//     // Assert
//     const callArg = res.json.getCall(0).args[0];
//     expect(callArg).to.not.have.property("token");
//   });
// });

// describe("UT-04: Login com usuário inexistente", () => {
//   let authController;
//   let mockAuthService;
//   let req;
//   let res;

//   beforeEach(() => {
//     mockAuthService = sinon.createStubInstance(AuthService);
//     authController = new AuthController(mockAuthService);

//     req = {
//       body: {
//         username: "usuarioinexistente",
//         password: "qualquer",
//       },
//     };

//     res = {
//       status: sinon.stub().returnsThis(),
//       json: sinon.stub().returnsThis(),
//     };
//   });

//   it("deve retornar erro 400 quando usuário não existe", async () => {
//     // Arrange
//     mockAuthService.login.resolves({
//       success: false,
//       message: "User not found",
//     });

//     // Act
//     await authController.login(req, res);

//     // Assert
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith({ message: "User not found" })).to.be.true;
//   });
// });
