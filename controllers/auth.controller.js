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

exports.signin = (req, res) => {
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

      var authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }

      res.status(200).send({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        roles: authorities,
        restaurants: user.restaurants,
        accessToken: token,
      });
    });
};

// Password reset handling

const oauth2Client = new OAuth2(
  "236367808536-ac1cd5a5tt855dfv1thjenfisthjostp.apps.googleusercontent.com", // ClientID
  "KkLrjAaSJ9fy9nobQM8HwPHj", // Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token:
    "1//04UlYTnnU7xtuCgYIARAAGAQSNwF-L9Iru3Rt7vM4AJgbO-dJ3O50x4GMlPW7WhWMQs_Kf81H_-Nz77t_aUprCYLL0TsVJkh-Gjk",
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
          clientId:
            "236367808536-ac1cd5a5tt855dfv1thjenfisthjostp.apps.googleusercontent.com",
          clientSecret: "KkLrjAaSJ9fy9nobQM8HwPHj",
          refreshToken:
            "1//04UlYTnnU7xtuCgYIARAAGAQSNwF-L9Iru3Rt7vM4AJgbO-dJ3O50x4GMlPW7WhWMQs_Kf81H_-Nz77t_aUprCYLL0TsVJkh-Gjk",
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
