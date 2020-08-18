const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./User");
db.role = require("./Role");
db.restaurant = require("./Restaurant");
db.menu = require("./Menu");
db.resetToken = require("./PasswordResetToken");
db.customer = require("./Customer");

db.ROLES = ["user", "admin", "moderator"];

module.exports = db;
