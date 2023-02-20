const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ClassCCchema = new Schema({
  name: String,
  email: String,
  password: String,
  verified: Boolean,
});

const ClassCC = mongoose.model("ClassCC", ClassCCchema);

module.exports = ClassCC;
