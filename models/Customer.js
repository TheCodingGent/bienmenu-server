const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const customerSchema = new Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  date: { type: String, default: Date.now },
  subscribed: { type: Boolean, default: false },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant" },
});

module.exports = mongoose.model("Customer", customerSchema);
