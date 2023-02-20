const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StudentPasswordResetSchema = new Schema({
  studentId: String,
  resetString: String,
  createdAt: Date,
  expiresAt: Date,
});

const StudentPasswordReset = mongoose.model(
  "StudentPasswordReset",
  StudentPasswordResetSchema
);

module.exports = StudentPasswordReset;
