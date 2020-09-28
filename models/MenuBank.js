const mongoose = require("mongoose");
const {
    ObjectId
} = require("mongodb");
const Schema = mongoose.Schema;

const MenuBankSchema = new Schema({
    _id: ObjectId,
    biemenuMenus: [{
        type: Schema.Types.ObjectId,
        ref: "Menu",
    }, ],
});

module.exports = mongoose.model("MenuBank", MenuBankSchema);