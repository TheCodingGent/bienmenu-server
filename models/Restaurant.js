const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  name: String,
  filename: String,
  lastupdated: { type: String, default: Date.now },
});

const restaurantSchema = new Schema({
  _id: ObjectId,
  name: String,
  city: String,
  address: String,
  menus: {
    type: [menuSchema],
    validate: [arrayLimit, "{PATH} exceeds the limit of 8"],
  },
  maxMenuCount: { type: Number, default: 4 },
  rating: { type: Number, default: 4.5 },
  color: { type: String, default: "#009688" },
});

function arrayLimit(val) {
  return val.length <= 4;
}

module.exports = mongoose.model("Restaurant", restaurantSchema);
