const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");

var hourFromNow = function () {
  return moment().add(1, "month");
};

const userSchema = new Schema({
  firstName: String,
  lastName: String,
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: String,
  stripeCustomerId: String,
  currentRestaurantCount: { type: Number, default: 0 },
  maxRestaurantCount: { type: Number, default: 1 },
  currentMenuUpdateCount: { type: Number, default: 0 },
  maxMenuUpdateCount: { type: Number, default: 1 },
  featuresExpiryDate: {
    type: Date,
    default: function () {
      return moment().add(1, "month");
    },
  },
  activeProducts: [String],
  roles: [
    {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
  ],
  restaurants: [
    {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
