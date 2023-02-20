const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CounsellingSchema = new Schema({
    name:String,
    rollno:String,
    class:String,
    year:String,
    department:String,
    date:Date,
    reason:String,
    observation:String

});

const Counselling = mongoose.model("Counselling",CounsellingSchema);

module.exports = Counselling;
