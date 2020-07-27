const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const menuSchema = new Schema({
  name: String,
  filename: String,
  lastupdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Menu", menuSchema);
