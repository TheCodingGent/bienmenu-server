const controller = require("../controllers/customer.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ADD
  app.post("/customers/tracing/add", controller.saveCustomer);
};
