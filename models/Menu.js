const mongoose = require("mongoose");
const {
  ObjectId
} = require("mongodb");
const Schema = mongoose.Schema;

const menuSectionItemSchema = new Schema({
  _id: ObjectId,
  order: Number,
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: "FoodItem",
  },
  menuSectionId: String,
  isActive: Boolean,

});

const menuSectionSchema = new Schema({
  _id: ObjectId,
  menuId: String,
  name: String,
  order: Number,
  menuSectionItems: {
    type: [menuSectionItemSchema],
  },
  isActive: Boolean,

});

const menuSchema = new Schema({
  _id: ObjectId,
  name: String,
  type: String,
  filename: String,
  lastupdated: {
    type: String,
    default: new Date().toISOString()
  },
  sections: {
    type: [menuSectionSchema],
  },
  isActive: Boolean,
  schedule: {
    type: [Boolean],
  },
  externalMenuLink: String,
});

module.exports = mongoose.model("Menu", menuSchema);