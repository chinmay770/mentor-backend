const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StudentVerificationSchema = new Schema({
  studentId: String,
  uniqueString: String,
  createdAt: Date,
  expiresAt: Date,
});

const StudentVerification = mongoose.model(
  "StudentVerification",
  StudentVerificationSchema
);

module.exports = StudentVerification;
