const controller = require("../controllers/file.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // GET
  app.get("/menu/pdf/:id/:filename", controller.getMenuFile);

  // ADD
  app.post("/menu/pdf/upload/:id", controller.uploadMenuFile);
};
