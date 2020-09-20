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

  app.get("/food-item/image/:id/:filename", controller.getImageFile);

  // ADD
  app.post("/menu/pdf/upload/:id", controller.uploadMenuFile);

  app.post("/food-item/image/upload/:id", controller.uploadImageFile);
};
