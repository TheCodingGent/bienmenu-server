const db = require("../models");
const moment = require("moment");
const User = db.user;

exports.allAccess = (req, res) => {
  res.status(200).send({ status: "success", msg: "Public Content." });
};

exports.userContent = (req, res) => {
  res.status(200).send({ status: "success", msg: "User Content." });
};

exports.adminContent = (req, res) => {
  res.status(200).send({ status: "success", msg: "Admin Content." });
};

exports.getUserRestaurants = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }
    res.status(200).send({ status: "success", restaurants: user.restaurants });
  });
};

// called once user logs in to check if a reset of their feature expiry is needed
exports.updateUserFeatureExpiryData = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    // handle resetting the monthly limit
    if (moment(moment().format()).isAfter(user.featuresExpiryDate)) {
      console.log(`Expiry has been met, resetting current count`);
      //reset user menu update count
      user.currentMenuUpdateCount = 0;
      user.featuresExpiryDate = moment(user.featuresExpiryDate).add(
        // add another month
        1,
        "month"
      );

      user.save((err) => {
        if (err) {
          console.log("failed to update user expiry date");
          res.status(500).send({ status: "error", err });
          return;
        }
        console.log(
          `User expiry token updated successfully to ${user.featuresExpiryDate}`
        );
        res.status(200).send({
          status: "success",
          msg: `User expiry token updated successfully to ${user.featuresExpiryDate}`,
        });
      });
    } else {
      res.status(200).send({ status: "success", msg: "No update needed" });
    }
  });
};

// verify token first which sets the userId
exports.checkMenuUpdateAllowed = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    if (
      user.maxMenuUpdateCount === -1 ||
      user.currentMenuUpdateCount < user.maxMenuUpdateCount
    ) {
      console.log(`User ${user.username} is allowed to update`);
      res
        .status(200)
        .send({ status: "success", msg: "User is allowed to update menu" });
      return;
    } else {
      console.log(`User ${user.username} is not allowed to update`);
      //user current menu update count exceeds allowed limit
      res.status(403).send({
        status: "error",
        msg: "Maximum number of allowed updates per month exceeded",
      });
    }
  });
};

exports.updateMenuUpdateCount = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    user.currentMenuUpdateCount += 1;

    user.save((err) => {
      if (err) {
        console.log(
          `Failed to update current menu count for user ${user.username} with error: ${err}`
        );
        res.status(500).send({ status: "error", err });
      }
      console.log(
        `User ${user.username} menu update count updated successfully`
      );
      res.status(200).send({
        status: "success",
        msg: "User menu update count was updated successfully",
      });
    });
  });
};

exports.updateRestaurantCount = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    user.currentRestaurantCount += 1;

    user.save((err) => {
      if (err) {
        console.log(
          `Failed to update current restaurant count for user ${user.username} with error: ${err}`
        );
        res.status(500).send({ status: "error", err });
      }
      console.log(
        `User ${user.username} restaurant count updated successfully`
      );
      res.status(200).send({
        status: "success",
        msg: "User restaurant count was updated successfully",
      });
    });
  });
};

exports.checkRestaurantAddAllowed = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      console.log(
        `Failed to check restaurant allowed for user ${req.userId} with error: ${err}`
      );
      res.status(500).send({ status: "error", err });
      return;
    }

    console.log(`Current user restaurant count ${user.currentRestaurantCount}`);

    if (user.currentRestaurantCount < user.maxRestaurantCount) {
      console.log(`User ${user.username} is allowed to add a new restaurant`);
      res
        .status(200)
        .send({ status: "success", msg: "Restaurant addition granted" });
      return;
    } else {
      console.log(
        `User ${user.username} is not allowed to add anymore restaurants`
      );
      //user current menu update count exceeds allowed limit
      res.status(403).send({
        status: "error",
        msg: "Maximum number of allowed restaurants exceeded",
      });
    }
  });
};

exports.getMaxMenuCountAllowed = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      console.log(
        `Failed to get max menu allowed count for user ${req.userId} with error: ${err}`
      );
      res.status(500).send({ status: "error", err });
      return;
    }

    res.status(200).send({
      status: "success",
      maxMenusPerRestaurant: user.maxMenusPerRestaurant,
    });
    return;
  });
};

exports.getUserHasContactTracing = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      console.log(
        `Failed to get max menu allowed count for user ${req.userId} with error: ${err}`
      );
      res.status(500).send({ status: "error", err });
      return;
    }

    if (user.hasContactTracing) {
      res.status(200).send({
        status: "success",
        msg: "user has contact tracing",
      });
    } else {
      res.status(403).send({
        status: "error",
        msg: "user does not have contact tracing",
      });
    }
  });
};

exports.updateUserPlan = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ status: "error", err });
      return;
    }

    if (req.body.plan) {
      user.plan = req.body.plan;
    } else {
      user.plan = "basic";
    }

    user.save((err) => {
      if (err) {
        console.log(
          `Failed to update user plan for user ${user.username} with error: ${err}`
        );
        res.status(500).send({ status: "error", err });
      }
      console.log(`User ${user.username} plan updated successfully`);
      res.status(200).send({
        status: "success",
        msg: "User rplan was updated successfully",
      });
    });
  });
};
