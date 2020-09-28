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
  app.get(
    "/restaurants",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getRestaurants
  );

  app.get("/restaurants/:id", controller.getRestaurantById);

  app.get("/restaurants/menus/:id", controller.getAllMenusForRestaurant);

  app.get(
    "/restaurants/get-contact-tracing/:id",
    controller.getContactTracingEnabled
  );

  app.get(
    "/restaurants/menu-max-count-reached/:id",
    [authJwt.verifyToken],
    controller.getMenuMaxCountReached
  );

  app.get("/restaurants/menus/:id", controller.getAllMenusForRestaurant);

  // ADD

  app.post("/restaurants/add", [authJwt.isAdmin], controller.addRestaurant);

  app.post(
    "/restaurants/add/user",
    [authJwt.verifyToken],
    controller.addRestaurantForUser
  );

  app.post(
    "/restaurants/menus/add/:id",
    [authJwt.verifyToken],
    controller.addMenuToRestaurant
  );

  // UPDATE

  app.post(
    "/restaurants/menus/update/:id",
    [authJwt.verifyToken],
    controller.updateMenuTimestamp
  );

  app.post(
    "/restaurants/set-contact-tracing/:id",
    [authJwt.verifyToken],
    controller.updateContactTracing
  );

  app.post(
    "/restaurants/update-cover-photo/:id",
    [authJwt.verifyToken],
    controller.updateCoverPhoto
  );

  app.post(
    "/restaurants/updated-menu-hosting/:id",
    [authJwt.verifyToken],
    controller.updateMenuHosting
  );

  // DELETE

  app.post(
    "/restaurants/menus/delete/:id",
    [authJwt.verifyToken],
    controller.deleteMenuForRestaurant
  );

  app.post(
    "/restaurants/delete/:id",
    [authJwt.verifyToken],
    controller.deleteRestaurantForUser
  );
};
