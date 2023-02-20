const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MentorSchema = new Schema({
  name: String,
  email: String,
  password: String,
  verified: Boolean,
  rollNumber: String,
  branch: String,
  divison: String,
  contactNumber: String,
  messages: [
    {
      name: String,
      message: String,
    },
  ],
  counselling: [
    {
        name: String,
        reason: String,
        Observation: String,
    }
  ],
});

const Mentor = mongoose.model("Mentor", MentorSchema);

module.exports = Mentor;
