const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/content/all", controller.allAccess);

  app.get("/api/content/user", [authJwt.verifyToken], controller.userContent);

  app.get(
    "/api/content/admin",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.adminContent
  );

  app.get(
    "/api/content/partner",
    [authJwt.verifyToken, authJwt.isPartner],
    controller.partnerContent
  );

  app.get(
    "/api/content/restaurants",
    [authJwt.verifyToken],
    controller.getUserRestaurants
  );

  app.get(
    "/api/content/features/update-allowed",
    [authJwt.verifyToken],
    controller.checkMenuUpdateAllowed
  );

  app.get(
    "/api/content/features/update-count",
    [authJwt.verifyToken],
    controller.updateMenuUpdateCount
  );

  app.get(
    "/api/content/features/update-feature-expiry",
    [authJwt.verifyToken],
    controller.updateUserFeatureExpiryData
  );

  app.get(
    "/api/content/features/update-restaurant-count",
    [authJwt.verifyToken],
    controller.updateRestaurantCount
  );

  app.get(
    "/api/content/features/add-restaurant-allowed",
    [authJwt.verifyToken],
    controller.checkRestaurantAddAllowed
  );

  app.get(
    "/api/content/features/max-menu-count-allowed",
    [authJwt.verifyToken],
    controller.getMaxMenuCountAllowed
  );

  app.get(
    "/api/content/features/has-contact-tracing",
    [authJwt.verifyToken],
    controller.getUserHasContactTracing
  );

  app.get(
    "/api/content/features/update-user-customerId",
    [authJwt.verifyToken],
    controller.updateUserCustomerId
  );

  app.post(
    "/api/content/features/update-user-plan",
    [authJwt.verifyToken],
    controller.updateUserPlan
  );
};
