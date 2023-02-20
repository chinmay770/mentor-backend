//files import
require("../config/db");

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const port = 8000 || process.env.PORT;

//api files import
const UserRouter = require("../api/User");
const CommonRouter = require("../api/Common");
const StudentRouter = require("../api/Student");
const MentorRouter = require("../api/Mentor");
const ClassCCRouter = require("../api/ClassCC");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//exporting all the other APIs and Routes.
app.use("/user", UserRouter);
app.use("/common", CommonRouter);
app.use("/student", StudentRouter);
app.use("/mentor", MentorRouter);
app.use("/class-cc", ClassCCRouter);

app.get("/", (req, res) => {
  res.send(`Server running on port ${port}`);
});


app.listen(port, () => console.log(`Server running on port ${port}`));
