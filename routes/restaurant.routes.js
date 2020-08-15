const controller = require("../controllers/restaurant.controller");
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
  app.get("/restaurants", controller.getRestaurants);

  app.get("/restaurants/:id", controller.getRestaurantById);

  app.get("/restaurants/menus/:id", controller.getAllMenusForRestaurant);

  app.get(
    "/restaurants/menu-max-count-reached/:id",
    [authJwt.verifyToken],
    controller.getMenuMaxCountReached
  );

  // ADD

  app.post("/restaurants/add", controller.addRestaurant);

  app.post(
    "/restaurants/add/user",
    [authJwt.verifyToken],
    controller.addRestaurantForUser
  );

  app.post("/restaurants/menus/add/:id", controller.addMenuToRestaurant);

  // UPDATE

  app.post("/restaurants/menus/update/:id", controller.updateMenuTimestamp);

  // DELETE

  app.post("/restaurants/menus/delete/:id", controller.deleteMenuForRestaurant);

  app.post(
    "/restaurants/delete/:id",
    [authJwt.verifyToken],
    controller.deleteRestaurantForUser
  );
};
