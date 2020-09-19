const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Schema = mongoose.Schema;

const foodItemSchema = new Schema({
  _id: ObjectId,
  name: String,
  description: String,
  imageUrl: String,
  tags: {
    type: [String],
  },
  price: Number,
  promotionPrice: Number,
  calories: Number,
  lastupdated: { type: String, default: new Date().toISOString() },
});

module.exports = mongoose.model("FoodItem", foodItemSchema);
