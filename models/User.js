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
  plan: String,
  stripeCustomerId: String,
  currentRestaurantCount: { type: Number, default: 0 },
  maxRestaurantCount: { type: Number, default: 1 },
  currentMenuUpdateCount: { type: Number, default: 0 },
  maxMenuUpdateCount: { type: Number, default: 1 },
  maxMenusPerRestaurant: { type: Number, default: 4 },
  hasContactTracing: { type: Boolean, default: false },
  featuresExpiryDate: {
    type: Date,
    default: function () {
      return moment().add(1, "month");
    },
  },
  activeProducts: [String],
  foodItemBank: {
    type: Schema.Types.ObjectId,
    ref: "FoodItemBank",
  },
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
