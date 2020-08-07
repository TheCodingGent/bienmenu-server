const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;
const PasswordResetToken = db.resetToken;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

// stripe setup to update with production key
const stripe = require("stripe")(process.env.STRIPE_API);

exports.signup = (req, res) => {
  console.log("Received request to register user: " + req.body.username);

  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8),
    restaurants: [],
  });

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
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
            res.status(500).send({ message: err });
            console.log("Failed to register user: " + err);
            return;
          }

          user.roles = roles.map((role) => role._id);
          user.save((err) => {
            if (err) {
              res.status(500).send({ message: err });
              console.log("Failed to register user: " + err);
              return;
            }

            res.send({ message: "User was registered successfully!" });
            console.log("User registered successfully: " + user.username);
          });
        }
      );
    } else {
      Role.findOne({ name: "user" }, (err, role) => {
        //if no roles are provided, set the default role to be user
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        user.roles = [role._id];
        user.save((err) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }

          res.send({ message: "User was registered successfully!" });
          console.log("User registered successfully: " + user.username);
        });
      });
    }
  });
};

exports.signin = async (req, res) => {
  console.log("Received request to login user: " + req.body.username);
  User.findOne({
    username: req.body.username,
  })
    .populate("roles", "-__v")
    .populate("restaurants", ["_id", "name"])
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!",
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400, // 24 hours
      });

      // check if user has a stripe customerId
      if (!user.stripeCustomerId) {
        console.log("User does not have a customer Id in the database");

        stripe.customers
          .list({ email: user.email, limit: 1 })
          .then((customers) => {
            // check if customer is found or not
            if (Array.isArray(customers.data) && customers.data.length) {
              //customer is found in stripe but no id in db, add customer id to our db
              user.stripeCustomerId = customers.data[0].id;
              stripe.subscriptions
                .list({
                  customer: user.stripeCustomerId,
                  limit: 3,
                  status: "active",
                })
                .then((subscriptions) => {
                  // check if any subscriptions found
                  console.log(subscriptions.data.length);
                  if (
                    Array.isArray(subscriptions.data) &&
                    subscriptions.data.length
                  ) {
                    //subscriptions found
                    for (let i = 0; i < subscriptions.data.length; i++) {
                      let subItems = subscriptions.data[i].items.data;
                      for (let j = 0; j < subItems.length; j++) {
                        // for each subscription, go through the sub items and add the active product ids to the user
                        if (subItems[i].price.active === true) {
                          user.activeProducts.push(subItems[i].price.id);
                        }
                      }
                    }
                  }
                  //update the users stripe customer id and their active products
                  user.save((err) => {
                    if (err) {
                      console.log(
                        "Failed to update user customerId and active products"
                      );
                    } else {
                      console.log(
                        `CustomerId and active products updated successfully for usr ${user.username}`
                      );
                    }
                  });

                  var authorities = [];

                  for (let i = 0; i < user.roles.length; i++) {
                    authorities.push(
                      "ROLE_" + user.roles[i].name.toUpperCase()
                    );
                  }

                  res.status(200).send({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    email: user.email,
                    roles: authorities,
                    restaurants: user.restaurants,
                    activeProducts: user.activeProducts,
                    accessToken: token,
                  });
                })
                .catch((error) => {
                  console.error(error);
                });
            } else {
              var authorities = [];

              for (let i = 0; i < user.roles.length; i++) {
                authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
              }

              res.status(200).send({
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                roles: authorities,
                restaurants: user.restaurants,
                activeProducts: user.activeProducts,
                accessToken: token,
              });
            } // else customer is not in db nor in stripe so they are on a basic plan
          })
          .catch((error) => console.error(error));
      } else {
        // stripe customer Id already exists only update their subscription products on login
        stripe.subscriptions
          .list({
            customer: user.stripeCustomerId,
            limit: 3,
            status: "active",
          })
          .then((subscriptions) => {
            // check if any subscriptions found
            console.log(subscriptions.data.length);
            if (
              Array.isArray(subscriptions.data) &&
              subscriptions.data.length
            ) {
              //subscriptions found
              for (let i = 0; i < subscriptions.data.length; i++) {
                let subItems = subscriptions.data[i].items.data;
                for (let j = 0; j < subItems.length; j++) {
                  // for each subscription, go through the sub items and add the active product ids to the user
                  if (subItems[i].price.active === true) {
                    user.activeProducts.push(subItems[i].price.id);
                  }
                }
              }
            }
            //update the users stripe customer id and their active products
            user.save((err) => {
              if (err) {
                console.log(
                  "Failed to update user customerId and active products"
                );
              } else {
                console.log(
                  `CustomerId and active products updated successfully for usr ${user.username}`
                );
              }
            });

            var authorities = [];

            for (let i = 0; i < user.roles.length; i++) {
              authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
            }

            res.status(200).send({
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              email: user.email,
              roles: authorities,
              restaurants: user.restaurants,
              activeProducts: user.activeProducts,
              accessToken: token,
            });
          })
          .catch((error) => {
            console.error(error);
          });
      }
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
  console.log("Received request to reset password for: " + req.body.email);
  if (!req.body.email) {
    return res.status(500).json({ message: "Email is required" });
  }
  User.findOne({
    email: req.body.email,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (!user) {
      return res.status(404).json({ message: "Email does not exist" });
    }

    var resettoken = new PasswordResetToken({
      _userId: user._id,
      resettoken: crypto.randomBytes(16).toString("hex"),
    });

    resettoken.save(function (err) {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      PasswordResetToken.find({
        _userId: user._id,
        resettoken: { $ne: resettoken.resettoken },
      })
        .remove()
        .exec();
      res
        .status(200)
        .json({ message: "Reset password request processed successfully." });

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
          "http://localhost:4200/reset-password/" +
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

// set a new password
exports.newPassword = (req, res) => {
  console.log(
    "Received request to update password for: " + req.body.resettoken
  );
  PasswordResetToken.findOne({ resettoken: req.body.resettoken }).exec(
    (err, userToken) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!userToken) {
        return res.status(409).json({ message: "Token has expired" });
      }
      console.log("Updating user in database...");
      User.findOne({
        _id: userToken._userId,
      }).exec((err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        if (!user) {
          return res.status(404).json({ message: "User does not exist" });
        }
        user.password = bcrypt.hashSync(req.body.newPassword, 8);
        user.save(function (err) {
          if (err) {
            return res
              .status(400)
              .json({ message: "Failed to reset Password..." });
          } else {
            userToken.remove();
            console.log("Password upadted successfully for " + user.username);
            return res
              .status(200)
              .json({ message: "Password was reset successfully" });
          }
        });
      });
    }
  );
};

// return if member is a plus member
// needs to be called after verifyPlusMember middleware
exports.plusMemberVerification = (req, res) => {
  // user has been verified to be logged
  // verify the user has a plus subscription
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    // PLUS product id: prod_HjAe5I8ubn6eLY
    for (let i = 0; i < user.activeProducts.length; i++) {
      if (
        user.activeProducts[i] === process.env.STRIPE_PLUS_PRICE_MONTHLY ||
        user.activeProducts[i] === process.env.STRIPE_PLUS_PRICE_YEARLY
      ) {
        console.log("User has plus membership");

        // generate a token and return it
        var plustoken = jwt.sign(
          { id: user.id, product: user.activeProducts[i] },
          config.secret,
          {
            expiresIn: 86400, // 24 hours
          }
        );

        res.status(200).send({
          subscriptionToken: plustoken,
        });
        return;
      }
    }

    res.status(403).send({
      message:
        "This view requires a plus membership! Please upgrade to access it.",
    });
    return;
  });
};

/****************************
 * Helpers
 ****************************/

getActiveProducts = (customerId) => {
  var activeProducts = [];
  stripe.subscriptions
    .list({
      customer: customerId,
      limit: 3,
      status: "active",
    })
    .then((subscriptions) => {
      // check if any subscriptions found
      console.log(subscriptions.data.length);
      if (Array.isArray(subscriptions.data) && subscriptions.data.length) {
        console.log("subscriptions found");
        //subscriptions found
        for (let i = 0; i < subscriptions.data.length; i++) {
          let subItems = subscriptions.data[i].items.data;
          console.log(`subitems ${subItems}`);
          for (let j = 0; j < subItems.length; j++) {
            // for each subscription, go through the sub items and add the active product ids to the user
            if (subItems[i].price.active === true) {
              console.log("found active item");
              console.log(subItems[i].price.id);

              activeProducts.push(subItems[i].price.id);
            }
          }
        }
      }
      return activeProducts;
    })
    .catch((error) => {
      console.error(error);
      return activeProducts;
    });
};
