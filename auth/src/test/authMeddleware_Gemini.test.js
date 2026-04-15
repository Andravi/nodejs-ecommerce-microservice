// const { expect } = require("chai");
// const sinon = require("sinon");
// const jwt = require("jsonwebtoken");
// const authMiddleware = require("../../src/middlewares/authMiddleware");
// const config = require("../../src/config");

// describe("UT-08: JWT Middleware Expiration", () => {
//   it("deve rejeitar token expirado", () => {
//     const expiredToken = jwt.sign({ id: 1 }, config.jwtSecret, {
//       expiresIn: "-1s",
//     });
//     const req = {
//       header: sinon.stub().withArgs("x-auth-token").returns(expiredToken),
//     };
//     const res = { status: sinon.stub().returnsThis(), json: sinon.spy() };
//     const next = sinon.spy();

//     authMiddleware(req, res, next);

//     expect(res.status.calledWith(400)).to.be.true;
//     expect(res.json.calledWith(sinon.match({ message: "Token is not valid" })))
//       .to.be.true;
//     expect(next.called).to.be.false;
//   });
// });
