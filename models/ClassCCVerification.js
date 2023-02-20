const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ClassCCVerificationSchema = new Schema({
  classCCId: String,
  uniqueString: String,
  createdAt: Date,
  expiresAt: Date,
});

const ClassCCVerification = mongoose.model(
  "ClassCCVerification",
  ClassCCVerificationSchema
);

module.exports = ClassCCVerification;
