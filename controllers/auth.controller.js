const config = require("../config/auth.config");
const moment = require("moment");
const db = require("../models");
const User = db.user;
const Role = db.role;
const PasswordResetToken = db.resetToken;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { ObjectId } = require("mongodb");
const FoodItemBank = require("../models/FoodItemBank");
const OAuth2 = google.auth.OAuth2;

// stripe setup to update with production key
const stripe = require("stripe")(process.env.STRIPE_API);

exports.signup = async (req, res) => {
  console.log("Received request to register user: " + req.body.username);

  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    email: req.body.email,
    plan: req.body.plan,
    password: bcrypt.hashSync(req.body.password, 8),
    restaurants: [],
  });

  // create the food item bank for the user and link it to the user
  var foodItemBank = new FoodItemBank({ _id: new ObjectId(), foodItems: [] });
  try {
    await foodItemBank.save();
    user.foodItemBank = foodItemBank._id;
  } catch (err) {
    console.log(
      `An error occurred while creating food item bank for user ${user.username}`
    );
    res.status(500).send({ err, status: "error" });
    return;
  }

  // create the stripe customer and add it to the user if they have any plan other than basic
  var customerId = await getCustomerId(req.body.plan, req.body.email);

  if (customerId) {
    user.stripeCustomerId = customerId;
  }

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ err, status: "error" });
      console.log("Failed to register user: " + err);
      return;
    }

    if (req.body.roles) {
      Role.find(
        {
          name: { $in: req.body.roles }, // find all roles matching provided roles in request
        },
        (err, roles) => {
          if (err) {
            res.status(500).send({ err, status: "error" });
            console.log("Failed to register user: " + err);
            return;
          }

          user.roles = roles.map((role) => role._id);
          user.save((err) => {
            if (err) {
              res.status(500).send({ err, status: "error" });
              console.log("Failed to register user: " + err);
              return;
            }

            res.send({
              status: "success",
              msg: "User was registered successfully!",
            });
            console.log("User registered successfully: " + user.username);
          });
        }
      );
    } else {
      Role.findOne({ name: "user" }, (err, role) => {
        //if no roles are provided, set the default role to be user
        if (err) {
          res.status(500).send({ err, status: "error" });
          return;
        }

        user.roles = [role._id];
        user.save((err) => {
          if (err) {
            res.status(500).send({ err, status: "error" });
            return;
          }

          res.send({
            status: "success",
            msg: "User was registered successfully!",
          });
          console.log("User registered successfully: " + user.username);
        });
      });
    }
  });
};

exports.signin = async (req, res) => {
  const username = req.body.username;
  var user;
  var subscriptionId;
  var activeProducts = [];

  console.log(`Received request to login user ${username}`);

  try {
    // get the user from the database
    user = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.username }],
    })
      .populate("roles", "-__v")
      .populate("restaurants", "name")
      .exec();
  } catch (err) {
    console.log(
      `An error occurred while retrieving user ${username} from the database`
    );
    res.status(500).send({ err, status: "error" });
    return;
  }

  if (!user) {
    return res.status(404).send({ status: "error", msg: "User not found" });
  }

  // correct password
  var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

  if (!passwordIsValid) {
    return res.status(401).send({
      status: "error",
      accessToken: null,
      msg: "Invalid password!",
    });
  }

  var token = jwt.sign({ id: user._id }, config.secret, {
    expiresIn: 86400, // 24 hours
  });

  // check if user has a stripe customer id in the db this should be created when they register or when they upgrade
  if (user.stripeCustomerId) {
    try {
      // we assume that each customer can only have one active subscription at a time
      var subscription = await stripe.subscriptions
        .list({
          customer: user.stripeCustomerId,
          limit: 1,
          status: "active",
        })
        .then((subscriptions) => {
          return subscriptions.data[0];
        });

      // if no active subscriptions are found check if there are any subscriptions in trial
      if (!subscription) {
        console.log(
          `No active subscriptions found checking to see if customer has any active trials`
        );
        subscription = await stripe.subscriptions
          .list({
            customer: user.stripeCustomerId,
            limit: 1,
            status: "trialing",
          })
          .then((subscriptions) => {
            // assume only the first subscription is valid
            return subscriptions.data[0];
          });
      }

      if (subscription) {
        subscriptionId = subscription.id;
      }
    } catch (err) {
      console.log(
        `An error occurred while retrieving subscriptions for ${user.email} from stripe: ${err}`
      );
      res.status(500).send({ err, status: "error" });
      return;
    }

    // if subscriptions found update the active products
    if (subscriptionId) {
      try {
        var subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // add all active products under the subscription
        for (let i = 0; i < subscription.items.data.length; i++) {
          let subItem = subscription.items.data[i];

          if (subItem.price.active === true) {
            activeProducts.push(subItem.price.product);
          }
        }

        // set the user active products
        user.activeProducts = activeProducts;
      } catch (err) {
        console.log(
          `An error occurred while retrieving subscription ${subscriptionId} from stripe: ${err}`
        );
        res.status(500).send({ err, status: "error" });
        return;
      }
    } else {
      console.log(`No subscriptions found for user ${user.username}`);
      // if no active subscriptions set the user back to basic
      user.activeProducts = [];
    }
  }

  user = updateUserBasedOnActiveProducts(user, user.activeProducts);

  //update the users stripe customer id and their active products
  user.save((err) => {
    if (err) {
      console.log(
        `An error occurred while updating user data for ${user.username}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      console.log(
        `CustomerId and active products updated successfully for user ${user.username}`
      );
    }
  });

  var authorities = [];

  for (let i = 0; i < user.roles.length; i++) {
    authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
  }

  res.status(200).send({
    status: "success",
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    accessToken: token,
    roles: authorities,
    plan: user.plan,
    restaurants: user.restaurants,
  });
};

// Password reset handling
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID, // ClientID
  process.env.GOOGLE_CLIENT_SECRET, // Client Secret
  process.env.GOOGLE_REDIRECT_URL // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_CLIENT_REFRESH_TOKEN,
});
const accessToken = oauth2Client.getAccessToken();

exports.resetpassword = (req, res) => {
  console.log(`Received request to reset password for: ${req.body.email}`);
  if (!req.body.email) {
    res.status(500);
    res.send({ status: "error", msg: "Email is required" });
    return;
  }
  User.findOne({
    email: req.body.email,
  }).exec((err, user) => {
    if (err) {
      res.status(500);
      res.send({ status: "error", err });
      return;
    }

    if (!user) {
      res.status(404);
      res.send({ status: "error", msg: "Email does not exist" });
      return;
    }

    var resettoken = new PasswordResetToken({
      _userId: user._id,
      resettoken: crypto.randomBytes(16).toString("hex"),
    });

    resettoken.save(function (err) {
      if (err) {
        res.status(500);
        res.send({ status: "error", err });
        return;
      }
      PasswordResetToken.find({
        _userId: user._id,
        resettoken: { $ne: resettoken.resettoken },
      })
        .remove()
        .exec();

      res.status(200).json({
        status: "success",
        msg: "Reset password request processed successfully.",
      });

      // send a email with the reset link
      const smtpTransport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          type: "OAuth2",
          user: "bienmenuapp@gmail.com",
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_CLIENT_REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });
      var mailOptions = {
        to: user.email,
        from: "bienmenuapp@gmail.com",
        subject: "BienMenu Account Password Reset",
        text:
          "You are receiving this email because you (or someone else) have requested the reset of the password on your BienMenu admin account.\n\n" +
          "Please click on the following link, or paste this into your browser to complete the reset process:\n\n" +
          "https://bienmenuapp.com/reset-password/" +
          resettoken.resettoken +
          "\n\n" +
          "If you did not request this, please ignore this email and your password will remain unchanged.\n",
      };

      smtpTransport.sendMail(mailOptions, (error, response) => {
        error ? console.log(error) : console.log(response);
        smtpTransport.close();
      });
    });
  });
};

// // set a new password
exports.newPassword = (req, res) => {
  console.log(
    "Received request to update password for: " + req.body.resettoken
  );
  PasswordResetToken.findOne({ resettoken: req.body.resettoken }).exec(
    (err, userToken) => {
      if (err) {
        res.status(500);
        res.send({ status: "error", err });
        return;
      }

      if (!userToken) {
        res.status(409);
        res.send({ status: "error", msg: "Token has expired" });
        return;
      }
      console.log("Updating user in database...");
      User.findOne({
        _id: userToken._userId,
      }).exec((err, user) => {
        if (err) {
          res.status(500);
          res.send({ status: "error", err });
          return;
        }

        if (!user) {
          res.status(404);
          res.send({ status: "error", msg: "User does not exist" });
          return;
        }
        user.password = bcrypt.hashSync(req.body.newPassword, 8);
        user.save(function (err) {
          if (err) {
            res.status(500);
            res.send({ status: "error", err });
            return;
          } else {
            userToken.remove();
            console.log("Password upadted successfully for " + user.username);
            return res
              .status(200)
              .json({ msg: "Password was reset successfully" });
          }
        });
      });
    }
  );
};

/****************************
 * Helpers
 ****************************/

updateUserBasedOnActiveProducts = (user, activeProducts) => {
  // Basic
  if (!activeProducts.length) {
    user.maxRestaurantCount = 1;
    user.maxMenuUpdateCount = 1;
    user.maxMenusPerRestaurant = 4;
    // user.hasContactTracing = false;
    user.hasContactTracing = true;
    user.plan = "basic";

    // update user expiry if current time is past their expiry token reset their menu update count for another month
    const currentTime = moment(moment().format());
    if (currentTime.isAfter(user.featuresExpiryDate)) {
      console.log(
        `Expiry has been met, resetting current menu update count for user ${user.username}`
      );
      //reset user menu update count
      user.currentMenuUpdateCount = 0;
      user.featuresExpiryDate = moment(currentTime).add(
        // add another month
        1,
        "month"
      );
    }
    return user;
  }

  // premium would be checked first

  // check for plus
  if (activeProducts.includes(process.env.STRIPE_PLUS_PRODUCT)) {
    user.maxRestaurantCount = 3;
    user.maxMenuUpdateCount = -1;
    user.maxMenusPerRestaurant = 8;
    user.hasContactTracing = true;
    user.plan = "plus";

    return user;
  }

  return user;
};

getCustomerId = async (plan, email) => {
  if (!plan || !email || plan === "basic") {
    return;
  }

  try {
    const customer = await stripe.customers.create({
      description: email,
      email: email,
    });

    return customer.id;
  } catch (err) {
    console.log(
      `An error occurred while creating customer in stripe for ${email}`
    );
    return;
  }
};
