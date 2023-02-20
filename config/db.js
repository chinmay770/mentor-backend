const mongoose = require("mongoose");
require("dotenv").config(".env");

mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

// mongoose
// .connect(
//   "mongodb+srv://dipesh107:rzKjpATvYH5sXzdd@cluster0.abt6q8m.mongodb.net/UserDB?retryWrites=true&w=majority",
//   {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   }
// )
// .then(() => {
//   console.log("Connected to DB");
// })
// .catch((err) => {
//   console.log(err);
// });
