const chai = require("chai");
const sinon = require("sinon");
const jwt = require("jsonwebtoken");
const expect = chai.expect;

const AuthController = require("../../src/controllers/authController");
const authMiddleware = require("../../src/middlewares/authMiddleware");


describe("AuthController Unit Tests", () => {
  let authServiceMock;
  let authController;
  let req;
  let res;

  beforeEach(() => {
    authServiceMock = {
      login: sinon.stub(),
      register: sinon.stub(),
      findUserByUsername: sinon.stub(),
    };

    authController = new AuthController(authServiceMock);

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
  });

  // UT-01
  it("UT-01: Deve falhar ao registrar sem username", async () => {
    req = { body: { password: "123" } };

    await authController.register(req, res);

    expect(res.status.calledWith(400)).to.be.true;
  });

  it("UT-01: Deve falhar ao registrar sem password", async () => {
    req = { body: { username: "teste" } };

    await authController.register(req, res);

    expect(res.status.calledWith(400)).to.be.true;
  });

  // UT-02
  it("UT-02: Deve impedir registro com username duplicado", async () => {
    authServiceMock.findUserByUsername.resolves({ username: "duplicado" });

    req = { body: { username: "duplicado", password: "123" } };

    await authController.register(req, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(
      res.json.calledWithMatch({
        message: "Username already taken",
      }),
    ).to.be.true;
  });

  // UT-03
  it("UT-03: Deve falhar login com senha incorreta", async () => {
    authServiceMock.login.resolves({
      success: false,
      message: "Invalid credentials",
    });

    req = { body: { username: "joao", password: "errada" } };

    await authController.login(req, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(
      res.json.calledWith({
        message: "Invalid credentials",
      }),
    ).to.be.true;
  });

  // UT-04
  it("UT-04: Deve falhar login com usuário inexistente", async () => {
    authServiceMock.login.resolves({
      success: false,
      message: "User not found",
    });

    req = { body: { username: "naoexiste", password: "123" } };

    await authController.login(req, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(
      res.json.calledWith({
        message: "User not found",
      }),
    ).to.be.true;
  });
});


describe("Auth Middleware", () => {
  it("UT-08: Deve rejeitar token expirado", () => {
    const expiredToken = jwt.sign({ id: "123" }, "secret", {
      expiresIn: "-1s",
    });

    const req = {
      header: () => expiredToken,
    };

    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    const next = sinon.spy();

    authMiddleware(req, res, next);

    expect(res.status.called).to.be.true;
    expect(next.called).to.be.false;
  });
});