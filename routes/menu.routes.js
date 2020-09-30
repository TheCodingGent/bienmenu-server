const controller = require("../controllers/menu.controller");
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
  app.get("/menus/menu/:id", [authJwt.verifyToken], controller.getMenuById);

  app.get(
    "/menus/restaurant/:restaurantId",
    [authJwt.verifyToken],
    controller.getMenusForRestaurant
  );

  // ADD

  app.post(
    "/menus/menu/add",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.addMenu
  );

  app.post(
    "/menus/menu/add/restaurant/:restaurantId",
    [authJwt.verifyToken],
    controller.addMenuForRestaurant
  );

  app.post(
    "/menus/menu/delete/:restaurantId",
    [authJwt.verifyToken],
    controller.deleteMenu
  );
};
