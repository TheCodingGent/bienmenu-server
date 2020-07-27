const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  name: String,
  filename: String,
  lastupdated: { type: Date, default: Date.now },
});

const restaurantSchema = new Schema({
  _id: ObjectId,
  name: String,
  city: String,
  address: String,
  menus: [menuSchema],
  rating: Number,
  color: String,
});

module.exports = mongoose.model(
  "Restaurant",
  restaurantSchema,
  "restaurants-dev"
);
