const chai = require("chai");
const { expect } = require("chai");
const sinon = require("sinon");
const AuthController = require("../../src/controllers/authController");

const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const GATEWAY_URL = "http://localhost:3003";

describe("Auth Unit Tests", () => {
  let authController;
  let mockAuthService;
  let req, res;

  beforeEach(() => {
    // Mock do serviço para isolar a unidade
    mockAuthService = {
      register: sinon.stub(),
      login: sinon.stub(),
      findUserByUsername: sinon.stub(),
    };
    authController = new AuthController(mockAuthService);

    // Spies para o objeto de resposta
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
    };
  });

  describe("UT-01: Registro com campos ausentes", () => {
    it("deve retornar 400 se o username estiver ausente", async () => {
      req = { body: { password: "123" } };
      await authController.register(req, res);

      // Nota: O código original pode precisar de um check de validação no controller
      expect(res.status.calledWith(400)).to.be.true;
    });

    it("deve retornar 400 se o password estiver ausente", async () => {
      req = { body: { username: "user" } };
      await authController.register(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });
  });

  describe("UT-02: Registro com usuário duplicado", () => {
    it("deve retornar 400 se findUserByUsername encontrar alguém", async () => {
      mockAuthService.findUserByUsername.resolves({ username: "duplicado" });
      req = { body: { username: "duplicado", password: "123" } };

      await authController.register(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(
        res.json.calledWith(sinon.match({ message: "Username already taken" })),
      ).to.be.true;
    });
  });

  describe("UT-03 & UT-04: Falhas no Login", () => {
    it("UT-03: deve retornar 400 para senha incorreta", async () => {
      mockAuthService.login.resolves({
        success: false,
        message: "Invalid credentials",
      });
      req = { body: { username: "joao", password: "errada" } };

      await authController.login(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Invalid credentials" })).to.be
        .true;
    });

    it("UT-04: deve retornar 400 para usuário inexistente", async () => {
      mockAuthService.login.resolves({
        success: false,
        message: "User not found",
      });
      req = { body: { username: "nao_existo", password: "123" } };

      await authController.login(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });
  });
});
