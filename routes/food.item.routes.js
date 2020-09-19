const controller = require("../controllers/food.item.controller");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // GET
  app.get("/food-items/food-item/:id", controller.getFoodItemById);

  app.get(
    "/food-items/user",
    [authJwt.verifyToken],
    controller.getFoodItemsForUser
  );

  // ADD

  app.post(
    "/food-items/add",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.addFoodItem
  );

  app.post(
    "/food-items/add/user",
    [authJwt.verifyToken],
    controller.addFoodItemForUser
  );
};
