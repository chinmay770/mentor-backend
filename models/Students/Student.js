const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
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
  achievements: [
    {
      name: String,
      // imageFile: String,
      description: String,
    },
  ],
  academics: [
    {
      activity: String,
      activityName: String,
      // imageFile: String,
      description: String,
    },
  ],
  semesterDetails: [
    {
      semester: String,
      cgpa: String,
      year: String,
      // imageFile: String,
      kt: String,
      attemptsForSem: String,
      clearedSemYear: String,
    },
  ],
});

const Student = mongoose.model("Student", StudentSchema);

module.exports = Student;
