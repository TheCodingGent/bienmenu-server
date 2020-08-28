const db = require("../models");
const User = db.user;
const Restaurant = db.restaurant;

const AWS = require("aws-sdk");

const AWSID = process.env.AWS_ACCESS_KEY_ID;
const AWSSECRET = process.env.AWS_SECRET_KEY;

const BUCKET_NAME = "bienmenu";

const s3 = new AWS.S3({
  accessKeyId: AWSID,
  secretAccessKey: AWSSECRET,
});

// get all restaurants
exports.getRestaurants = (req, res) => {
  console.log(`Received request for all restaurants`);

  Restaurant.find().exec(function (err, restaurants) {
    if (err) {
      console.log(`An error occurred while retrieving all restaurants: ${err}`);
      res.status(500);
      res.send({ status: "error", err });
    } else if (restaurants === null) {
      res.status(404);
      res.send({ status: "error", msg: "No restaurants found" });
    } else {
      res.send(restaurants);
      console.log(`Successfully retrieved all restaurants`);
    }
  });
};

// get restaurant by id
exports.getRestaurantById = (req, res) => {
  const restaurantId = req.params.id;
  console.log(`Received request for restaurant ${restaurantId}`);

  // make sure the id is a valid Mongo DB Id
  if (!db.mongoose.Types.ObjectId.isValid(restaurantId)) {
    res.status(500);
    res.send({ status: "error", msg: "Recieved invalid Id..." });
    return;
  }

  Restaurant.findOne({ _id: restaurantId }).exec(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while retrieving restaurant ${restaurantId}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: `Restaurant ${restaurantId} not found`,
      });
    } else {
      res.send(restaurant);
      console.log(`Retrieved restaurant: ${restaurant.name} successfully.`);
    }
  });
};

// add a new restaurant
exports.addRestaurant = (req, res) => {
  console.log(`Received request to add restaurant`);
  // if color was not supplied, delete it to use default
  if (req.body.color === "") delete req.body.color;

  var restaurant = new Restaurant(req.body);

  restaurant.save(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while adding restaurant ${restaurant.name}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      res.send({ status: "success", msg: "Restaurant added successfully!" });
      console.log(
        `${restaurant.name} has been saved successfully to the restaurants collection.`
      );
    }
  });
};

// add a new restaurant for a user
exports.addRestaurantForUser = (req, res) => {
  console.log(`Received request to add restaurant for user`);
  // if color was not supplied, delete it to use default
  if (req.body.color === "") delete req.body.color;

  var userId = req.userId;
  var restaurant = new Restaurant(req.body);

  // save restaurant to the restaurants collection
  restaurant.save(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while adding restaurant ${restaurant.name}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      console.log(
        `${restaurant.name} has been saved successfully to the restaurants collection.`
      );

      // if restaurant was added successfully add the restaurant Id to the users restaurants
      User.findOneAndUpdate(
        { _id: userId },
        { $push: { restaurants: restaurant._id } },
        { new: true }
      ).exec(function (err, user) {
        if (err) {
          console.log(
            `An error occurred while adding restaurant ${restaurant.name} for user ${userId}: ${err}`
          );
          res.status(500);
          res.send({ status: "error", err });
        } else if (user === null) {
          res.status(404);
          res.send({ status: "error", msg: `User ${userId} not found` });
        } else {
          res.send({
            status: "success",
            msg: "Restaurant and user have been updated successfully!",
          });
          console.log(
            `Added restaurant ${restaurant.name} to user ${user.username} successfully.`
          );
        }
      });
    }
  });
};

// get all menus for a given restaurant
exports.getAllMenusForRestaurant = (req, res) => {
  const restaurantId = req.params.id;
  console.log(`Received request for all menus for restaurant ${restaurantId}`);

  Restaurant.findOne({ _id: restaurantId }).exec(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while retrieving menus for restaurant ${restaurantId}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: `Restaurant ${restaurantId} not found`,
      });
    } else {
      res.send(restaurant.menus);
      console.log(
        `Retrieved ${restaurant.menus.lengthmenus} for restaurant ${restaurantId} successfully.`
      );
    }
  });
};

// Add a menu to an existing restaurant
exports.addMenuToRestaurant = (req, res) => {
  const menu = req.body;
  const restaurantId = req.params.id;

  console.log(
    `Received request to add a menu ${menu.name} to restaurant ${restaurantId}`
  );

  // find restaurant and update the menu
  Restaurant.findOneAndUpdate(
    { _id: restaurantId },
    { $push: { menus: menu } },
    { new: true }
  ).exec(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while adding menu ${menu.name} to restaurant ${restaurantId}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      res.send({ status: "success", msg: "Menu added successfully!" });
      console.log(
        `Menu ${menu.name} has been added successfully to restaurant ${restaurant.name}`
      );
    }
  });
};

// Update timestamp for a given menu, because the file has been updated
exports.updateMenuTimestamp = (req, res) => {
  const menu = req.body;
  const restaurantId = req.params.id;

  console.log(
    `Received request to update menu ${menu.name} for restaurant ${restaurantId}`
  );

  Restaurant.findOneAndUpdate(
    { _id: restaurantId, "menus._id": menu._id },
    { $set: { "menus.$.lastupdated": new Date().toISOString() } }
  ).exec(function (err, restaurant) {
    if (err) {
      console.log(`An error occurred while updating menu ${menu.name}: ${err}`);
      res.status(500);
      res.send({ status: "error", err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: `Restaurant ${restaurantId} not found`,
      });
    } else {
      res.send({ status: "success", msg: "Menu updated successfully!" });
      console.log(`Menu ${menu.name} timestamp updated successfully!`);
    }
  });
};

// delete a menu from a given restaurant
exports.deleteMenuForRestaurant = (req, res) => {
  const menu = req.body;
  const restaurantId = req.params.id;

  console.log(
    `Received request to delete menu ${menu.name} for restaurant ${restaurantId}`
  );

  Restaurant.update(
    {},
    { $pull: { menus: { _id: menu._id } } },
    { multi: true }
  ).exec(function (err, restaurant) {
    if (err) {
      console.log(`An error occurred while deleting menu ${menu.name}: ${err}`);
      res.status(500);
      res.send({ status: "error", err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({ status: "error", msg: "Menu not found" });
    } else {
      // upon successful deletion from the database delete file from cloud storage
      var fileKey = `menus/${restaurantId}/${menu.filename}.pdf`;
      var params = { Bucket: BUCKET_NAME, Key: fileKey };

      // delete file from AWS
      s3.deleteObject(params, function (err, data) {
        if (err) {
          console.log(
            `An error occurred while trying to delete the menu ${menu.name} file: ${err}`
          );
          res.status(500).send({ error: err });
        }
        // menu file successfully deleted from AWS and from database
        else {
          res.send({ status: "success", msg: "Menu deleted successfully!" });
          console.log(`Deleted menu ${menu.name} successfully`);
        }
      });
    }
  });
};

// delete a menu from a given restaurant
exports.deleteRestaurantForUser = (req, res) => {
  const userId = req.userId;
  const restaurantId = req.params.id;

  console.log(
    `Received request to delete restaurant ${restaurantId} for user ${userId}`
  );

  User.findOneAndUpdate(
    { _id: userId },
    { $pull: { restaurants: restaurantId } }
  ).exec(function (err, user) {
    if (err) {
      console.log(`An error occurred while deleting menu ${menu.name}: ${err}`);
      res.status(500);
      res.send({ status: "error", err });
    } else if (user === null) {
      res.status(404);
      res.send({ status: "error", msg: "User not found" });
    } else {
      user.currentRestaurantCount -= 1;
      user.save(function (err, user) {
        if (err) {
          console.log(
            `An error occurred while updating restaurant count for user ${user.name}: ${err}`
          );
          res.status(500);
          res.send({ status: "error", err });
        } else {
          res.send({
            status: "success",
            msg: "Restaurant deleted successfully!",
          });
          console.log(
            `Deleted restaurant ${restaurantId} successfully for user ${user.username}`
          );
        }
      });
    }
  });
};

exports.getMenuMaxCountReached = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    const maxMenuCount = user.maxMenusPerRestaurant;
    const restaurantId = req.params.id;

    Restaurant.findById(restaurantId).exec((err, restaurant) => {
      if (err) {
        res.status(500).send({ status: "error", err });
        return;
      }

      if (restaurant.menus.length < maxMenuCount) {
        res.status(200).send({
          status: "success",
          msg: "User is allowed to add more menus",
        });
        return;
      } else {
        console.log(
          `User ${user.username} is not allowed to add anymore menus`
        );
        //user current menu update count exceeds allowed limit
        res.status(403).send({
          status: "error",
          msg: "Maximum number of allowed menus for this restaurant reached",
        });
      }
    });
  });
};

exports.getContactTracingEnabled = (req, res) => {
  const restaurantId = req.params.id;

  Restaurant.findById(restaurantId).exec((err, restaurant) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    res.status(200).send({
      status: "success",
      msg: "User is allowed to add more menus",
      tracingEnabled: restaurant.tracingEnabled,
    });
  });
};

exports.updateContactTracing = (req, res) => {
  const restaurantId = req.params.id;

  Restaurant.findById(restaurantId).exec((err, restaurant) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    restaurant.tracingEnabled = req.body.tracingEnabled;

    restaurant.save(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while updating contact tracing for restaurant ${restaurant.name}: ${err}`
        );
        res.status(500);
        res.send({ status: "error", err });
      } else {
        res.send({
          status: "success",
          msg: "Restaurant updated successfully!",
        });
        console.log(
          `Updated restaurant ${restaurantId} successfully for with value of contact tracing ${req.body.tracingEnabled}`
        );
      }
    });
  });
};

exports.updateMenuHosting = (req, res) => {
  const restaurantId = req.params.id;

  Restaurant.findById(restaurantId).exec((err, restaurant) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    restaurant.hostedInternal = req.body.hostedInternal;

    restaurant.save(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while updating contact tracing for restaurant ${restaurant.name}: ${err}`
        );
        res.status(500);
        res.send({ status: "error", err });
      } else {
        res.send({
          status: "success",
          msg: "Restaurant updated successfully!",
        });
        console.log(
          `Updated restaurant ${restaurantId} successfully for with value of hosted internal ${req.body.hostedInternal}`
        );
      }
    });
  });
};
