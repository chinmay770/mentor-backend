const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MentorVerificationSchema = new Schema({
  mentorId: String,
  uniqueString: String,
  createdAt: Date,
  expiresAt: Date,
});

const MentorVerification = mongoose.model(
  "MentorVerification",
  MentorVerificationSchema
);

module.exports = MentorVerification;
