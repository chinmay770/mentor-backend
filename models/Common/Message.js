const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  firstName: String,
  lastName: String,
  email: String,
  mobile: String,
  message: String,
});

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
