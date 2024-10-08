const db = require("../models");
const MenuBank = require("../models/MenuBank");
const { ObjectId } = require("mongodb");
const User = db.user;
const Restaurant = db.restaurant;
const Menu = require("../models/Menu");

// get all restaurants
exports.getRestaurants = (req, res) => {
  console.log(`Received request for all restaurants`);

  Restaurant.find().exec(function (err, restaurants) {
    if (err) {
      console.log(`An error occurred while retrieving all restaurants: ${err}`);
      res.status(500);
      res.send({
        status: "error",
        err,
      });
    } else if (restaurants === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: "No restaurants found",
      });
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
    res.send({
      status: "error",
      msg: "Recieved invalid Id...",
    });
    return;
  }

  Restaurant.findOne({
    _id: restaurantId,
  })
    .populate({
      path: "menuBank",
      model: MenuBank,
      populate: {
        path: "menus",
        model: Menu,
      },
    })

    .exec(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while retrieving restaurant ${restaurantId}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
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
exports.addRestaurant = async (req, res) => {
  console.log(`Received request to add restaurant`);
  // if color was not supplied, delete it to use default
  if (req.body.color === "") delete req.body.color;

  var restaurant = new Restaurant(req.body);
  // create the Menu bank for the restaurant and link it to the restaurant
  var menuBank = new MenuBank({
    _id: new ObjectId(),
    menus: [],
  });
  try {
    await menuBank.save();
    restaurant.menuBank = menuBank._id;
  } catch (err) {
    console.log(
      `An error occurred while creating menu bank for restaurant ${restaurant.name}`
    );
    res.status(500).send({
      err,
      status: "error",
    });
    return;
  }
  restaurant.save(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while adding restaurant ${restaurant.name}: ${err}`
      );
      res.status(500);
      res.send({
        status: "error",
        err,
      });
    } else {
      res.send({
        status: "success",
        msg: "Restaurant added successfully!",
      });
      console.log(
        `${restaurant.name} has been saved successfully to the restaurants collection.`
      );
    }
  });
};

// add a new restaurant for a user
exports.addRestaurantForUser = async (req, res) => {
  console.log(`Received request to add restaurant for user`);
  // if color was not supplied, delete it to use default
  if (req.body.color === "") delete req.body.color;

  var userId = req.userId;
  var restaurant = new Restaurant(req.body);

  // create the Menu bank for the restaurant and link it to the restaurant
  var menuBank = new MenuBank({
    _id: new ObjectId(),
    menus: [],
  });
  try {
    await menuBank.save();
    restaurant.menuBank = menuBank._id;
  } catch (err) {
    console.log(
      `An error occurred while creating menu bank for restaurant ${restaurant.name}`
    );
    res.status(500).send({
      err,
      status: "error",
    });
    return;
  }

  // save restaurant to the restaurants collection
  restaurant.save(function (err, restaurant) {
    if (err) {
      console.log(
        `An error occurred while adding restaurant ${restaurant.name}: ${err}`
      );
      res.status(500);
      res.send({
        status: "error",
        err,
      });
    } else {
      console.log(
        `${restaurant.name} has been saved successfully to the restaurants collection.`
      );

      // if restaurant was added successfully add the restaurant Id to the users restaurants
      User.findOneAndUpdate(
        {
          _id: userId,
        },
        {
          $push: {
            restaurants: restaurant._id,
          },
        },
        {
          new: true,
        }
      ).exec(function (err, user) {
        if (err) {
          console.log(
            `An error occurred while adding restaurant ${restaurant.name} for user ${userId}: ${err}`
          );
          res.status(500);
          res.send({
            status: "error",
            err,
          });
        } else if (user === null) {
          res.status(404);
          res.send({
            status: "error",
            msg: `User ${userId} not found`,
          });
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

  Restaurant.findOne({
    _id: restaurantId,
  })
    .populate({
      path: "menuBank",
      model: MenuBank,
      populate: {
        path: "menus",
        model: Menu,
      },
    })
    .exec(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while retrieving menus for restaurant ${restaurantId}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
      } else if (restaurant === null) {
        res.status(404);
        res.send({
          status: "error",
          msg: `Restaurant ${restaurantId} not found`,
        });
      } else {
        res.send(restaurant.menuBank.menus);
      }
    });
};

exports.deleteRestaurantForUser = (req, res) => {
  const userId = req.userId;
  const restaurantId = req.params.id;

  console.log(
    `Received request to delete restaurant ${restaurantId} for user ${userId}`
  );

  User.findOneAndUpdate(
    {
      _id: userId,
    },
    {
      $pull: {
        restaurants: restaurantId,
      },
    }
  ).exec(function (err, user) {
    if (err) {
      console.log(`An error occurred while deleting menu ${menu.name}: ${err}`);
      res.status(500);
      res.send({
        status: "error",
        err,
      });
    } else if (user === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: "User not found",
      });
    } else {
      user.currentRestaurantCount -= 1;
      user.save(function (err, user) {
        if (err) {
          console.log(
            `An error occurred while updating restaurant count for user ${user.name}: ${err}`
          );
          res.status(500);
          res.send({
            status: "error",
            err,
          });
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
      res.status(500).send({
        status: "error",
        err,
      });
      return;
    }

    const maxMenuCount = user.maxMenusPerRestaurant;
    const restaurantId = req.params.id;

    Restaurant.findById(restaurantId).exec(async (err, restaurant) => {
      if (err) {
        res.status(500).send({
          status: "error",
          err,
        });
        return;
      }
      var menuBank = await MenuBank.findById(restaurant.menuBank._id).exec();
      if (!menuBank) {
        return res.status(404).send({
          status: "error",
          msg: "No menu bank found",
        });
      }
      if (menuBank.menus.length < maxMenuCount) {
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
      res.status(500).send({
        status: "error",
        err,
      });
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
      res.status(500).send({
        status: "error",
        err,
      });
      return;
    }

    restaurant.tracingEnabled = req.body.tracingEnabled;

    restaurant.save(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while updating contact tracing for restaurant ${restaurant.name}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
      } else {
        res.send({
          status: "success",
          msg: "Restaurant updated successfully!",
        });
      }
    });
  });
};

exports.updateCoverPhoto = (req, res) => {
  const restaurantId = req.params.id;

  Restaurant.findById(restaurantId).exec((err, restaurant) => {
    if (err) {
      res.status(500).send({
        status: "error",
        err,
      });
      return;
    }

    restaurant.coverPhotoUrl = req.body.coverPhotoUrl;
    restaurant.coverPhotoFilename = req.body.coverPhotoFilename

    restaurant.save(function (err, restaurant) {
      if (err) {
        console.log(
          `An error occurred while updating cover photo url for restaurant ${restaurant.name}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
      } else {
        res.send({
          status: "success",
          msg: "Restaurant updated successfully!",
        });
      }
    });
  });
};
