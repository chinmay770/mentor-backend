const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

//importing mongoose model file
const User = require("../models/User");

//register route
router.post("/register", async (req, res) => {
  let { name, email, password } = req.body;

  name = name.trim();
  email = email.trim();
  password = password.trim();

  if (name == "" || email == "" || password == "") {
    res.json({
      status: "FAILED",
      message: "Empty inputs are not allowed.",
    });
  } else if (!/^[a-zA-Z ]*$/.test(name)) {
    res.json({
      status: "FAILED",
      message: "Invalid Name entered.",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({
      status: "FAILED",
      message: "Invalid Email entered.",
    });
  } else if (password.length < 8) {
    res.json({
      status: "FAILED",
      message: "Password must be 8 characters or more.",
    });
  } else {
    //check if user is already present in the database.
    User.find({ email: { $eq: email } })
      .then((result) => {
        if (result.length) {
          //check if already exists a user
          res.json({
            status: "FAILED",
            message: "User with email already exists!",
          });
        } else {
          //create a new user

          //hashing the password for better security
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newUser = new User({
                name,
                email,
                password: hashedPassword,
              });

              newUser.save().then((result) => {
                res
                  .json({
                    status: "SUCCESS",
                    message: "User successfully created!",
                    data: result,
                  })
                  .catch((err) => {
                    res.json({
                      staus: "FAILED",
                      message: "An error occured while registering the user.",
                    });
                  });
              });
            })
            .catch((err) => {
              console.log(err);
              res.json({
                status: "FAILED",
                message: "An error occured while password hashing.",
              });
            });
        }
      })
      .catch((err) => {
        // console.log(err);
        res.json({
          status: "FAILED",
          message: "Error occured while checking for the existing user!",
        });
      });
  }
});

//login route
router.post("/login", async (req, res) => {
  let { email, password } = req.body;

  email = email.trim();
  password = password.trim();

  if (email == "" || password == "") {
    res.json({
      status: "FAILED",
      message: "Empty credentials are not allowed!",
    });
  } else {
    User.find({ email: { $eq: email } })
      .then((data) => {
        if (data.length) {
          const hashedPassword = data[0].password;
          bcrypt
            .compare(password, hashedPassword)
            .then((result) => {
              if (result) {
                res.json({
                  status: "SUCCESS",
                  message: "Login successfull.",
                  data: data,
                });
              } else {
                res.json({
                  status: "FAILED",
                  message: "Invalid Password Entered.",
                });
              }
            })
            .catch((err) => {
              console.log(err);
              res.json({
                status: "FAILED",
                message: "An error occurred while comapring the passwords",
              });
            });
        } else {
          res.json({
            status: "FAILED",
            message: "Invalid credetials entered.",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "An error occurred while checking for exisiting user.",
        });
      });
  }
});

module.exports = router;
