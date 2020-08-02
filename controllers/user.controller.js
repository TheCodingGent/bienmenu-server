const db = require("../models");
const moment = require("moment");
const User = db.user;

exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

exports.userContent = (req, res) => {
  res.status(200).send("User Content.");
};

exports.adminContent = (req, res) => {
  res.status(200).send("Admin Content.");
};

// called once user logs in to check if a reset of their feature expiry is needed
exports.updateUserFeatureExpiryData = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
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
          res.status(500).send({ message: err });
          return;
        }
        console.log(
          `User expiry token updated successfully to ${user.featuresExpiryDate}`
        );
        res
          .status(200)
          .send(
            `User expiry token updated successfully to ${user.featuresExpiryDate}`
          );
      });
    } else {
      res.status(200).send("No update needed");
    }
  });
};

// verify token first which sets the userId
exports.checkMenuUpdateAllowed = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    //user is allowed to update menu
    console.log(`Current user update count ${user.currentMenuUpdateCount}`);
    console.log(`Current user expiry ${user.featuresExpiryDate}`);

    if (user.currentMenuUpdateCount < user.maxMenuUpdateCount) {
      console.log(`User ${user.username} is allowed to update`);
      res.status(200).send("User is allowed to update menu");
      return;
    } else {
      console.log(`User ${user.username} is not allowed to update`);
      //user current menu update count exceeds allowed limit
      res.status(403).send({
        message: "Maximum number of allowed updates per month exceeded",
      });
    }
  });
};

exports.updateMenuUpdateCount = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    user.currentMenuUpdateCount += 1;

    user.save((err) => {
      if (err) {
        console.log(
          `Failed to update current menu count for user ${user.username} with error: ${err}`
        );
        res.status(500).send({ message: err });
      }
      console.log(
        `User ${user.username} menu update count updated successfully`
      );
      res.status(200).send("User menu update count was updated successfully");
    });
  });
};

exports.updateRestaurantCount = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    user.currentRestaurantCount += 1;

    user.save((err) => {
      if (err) {
        console.log(
          `Failed to update current restaurant count for user ${user.username} with error: ${err}`
        );
        res.status(500).send({ message: err });
      }
      console.log(
        `User ${user.username} restaurant count updated successfully`
      );
      res.status(200).send("User restaurant count was updated successfully");
    });
  });
};

exports.checkRestaurantAddAllowed = (req, res) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    console.log(`Current user restaurant count ${user.currentRestaurantCount}`);

    if (user.currentRestaurantCount < user.maxRestaurantCount) {
      console.log(`User ${user.username} is allowed to add a new restaurant`);
      res.status(200).send("Restaurant addition granted");
      return;
    } else {
      console.log(
        `User ${user.username} is not allowed to add anymore restaurants`
      );
      //user current menu update count exceeds allowed limit
      res.status(403).send({
        message: "Maximum number of allowed restaurants exceeded",
      });
    }
  });
};
