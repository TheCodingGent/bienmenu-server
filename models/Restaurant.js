const mongoose = require("mongoose");
const {
  ObjectId
} = require("mongodb");
const Schema = mongoose.Schema;

// const menuSchema = new Schema({
//   name: String,
//   filename: String,
//   lastupdated: {
//     type: String,
//     default: new Date().toISOString(),
//   },
// });

const restaurantSchema = new Schema({
  _id: ObjectId,
  name: String,
  country: String,
  province: String,
  postalCode: String,
  city: String,
  address: String,
  phone: String,
  coverPhotoUrl: String,
  coverPhotoFilename: String,

  // menus: {
  //   type: [menuSchema],
  // },
  menuBank: {
    type: Schema.Types.ObjectId,
    ref: "MenuBank",
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  color: {
    type: String,
    default: "#009688",
  },
  tracingEnabled: {
    type: Boolean,
    default: false,
  },
  // externalMenuLink: {
  //   type: String,
  //   default: "",
  // },
  // hostedInternal: {
  //   type: Boolean,
  //   default: true,
  // },
});

module.exports = mongoose.model("Restaurant", restaurantSchema);