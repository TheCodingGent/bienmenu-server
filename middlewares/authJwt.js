const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;
const PasswordResetToken = db.resetToken;

verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({ message: "Please login to view this page!" });
  }

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access!" });
    }
    req.userId = decoded.id;
    next();
  });
};

validPasswordToken = (req, res, next) => {
  console.log("Validating reset token...");
  if (!req.body.resettoken) {
    return res.status(500).json({ message: "Token is required" });
  }

  // find the token and verify it belongs to the user
  PasswordResetToken.findOne({
    resettoken: req.body.resettoken,
  }).exec((err, pwtoken) => {
    if (!pwtoken) {
      return res.status(409).json({ message: "Invalid URL" });
    }

    // find a user matching the token
    User.findOne({ _id: pwtoken._userId })
      .then(() => {
        next();
      })
      .catch((err) => {
        return res.status(500).send({ message: err.message });
      });
  });
};

isAdmin = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    Role.find(
      {
        _id: { $in: user.roles },
      },
      (err, roles) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        for (let i = 0; i < roles.length; i++) {
          if (roles[i].name === "admin") {
            next();
            return;
          }
        }

        res.status(403).send({ message: "This view requires Admin rights!" });
        return;
      }
    );
  });
};

isPartner = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    Role.find(
      {
        _id: { $in: user.roles },
      },
      (err, roles) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }

        for (let i = 0; i < roles.length; i++) {
          if (roles[i].name === "partner") {
            next();
            return;
          }
        }

        res.status(403).send({
          message: "This view is currently only available for exclusive users",
        });
        return;
      }
    );
  });
};

const authJwt = {
  verifyToken,
  validPasswordToken,
  isAdmin,
  isPartner,
};
module.exports = authJwt;
