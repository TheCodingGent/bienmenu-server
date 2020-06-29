const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  name: String,
  url: String,
});

const restaurantSchema = new Schema({
  name: String,
  city: String,
  address: String,
  menus: [menuSchema],
  rating: Number,
  color: String,
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
