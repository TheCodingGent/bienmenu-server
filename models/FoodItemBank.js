const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const Schema = mongoose.Schema;

const foodItemBankSchema = new Schema({
  _id: ObjectId,
  foodItems: [
    {
      type: Schema.Types.ObjectId,
      ref: "FoodItem",
    },
  ],
});

module.exports = mongoose.model("FoodItemBank", foodItemBankSchema);
