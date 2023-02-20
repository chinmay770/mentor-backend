const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
require("dotenv").config();

//path for static verified page
const path = require("path");

//importing mongoose model file
const ClassCC = require("../models/ClassCC");

//verification model file imported
const CCVerification = require("../models/ClassCCVerification");

//email handlers imported here
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

//nodemailer transporter stuff
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for messages.");
    console.log(success);
  }
});

//send verification function
const sendVerificationEmail = ({ _id, email }, res) => {
  //url to be used in the send verification email
  const currentUrl = "http://localhost:8000/";

  const uniqueString = uuidv4() + _id;

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify Your Email",
    html: `<p>Verify your email address to complete the signup and login process of your account.</p>
    <p>This link <b>expires within 6 hours</b></p>.
    <p>Press 
    <a href=${
      currentUrl + "class-cc/verify/" + _id + "/" + uniqueString
    }>here</a> to proceed.</p>`,
  };

  //hash the uniqueString
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      //setting values in userVerification Schema
      const newVerification = new CCVerification({
        classCCId: _id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });

      //saving the verification schema
      newVerification
        .save()
        .then(() => {
          transporter
            .sendMail(mailOptions)
            .then(() => {
              //email verification pending
              res.json({
                status: "PENDING",
                message: "Verification Email sent",
              });
            })
            .catch((error) => {
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Verification Email failed",
              });
            });
        })
        .catch((err) => {
          console.log(err);
          res.json({
            status: "FAILED",
            message: "Couldn't save verification email data!",
          });
        });
    })
    .catch(() => {
      res.json({
        status: "FAILED",
        message: "An error occured while hashing the email data!",
      });
    });
};

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
    //check if ClassCC is already present in the database.
    ClassCC.find({ email: { $eq: email } })
      .then((result) => {
        if (result.length) {
          //check if already exists a ClassCC
          res.json({
            status: "FAILED",
            message: "ClassCC with email already exists!",
          });
        } else {
          //create a new ClassCC

          //hashing the password for better security
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newClassCC = new ClassCC({
                name,
                email,
                password: hashedPassword,
                verified: false,
              });

              newClassCC
                .save()
                .then((result) => {
                  // res.json({
                  //   status: "SUCCESS",
                  //   message: "Student successfully created!",
                  //   data: result,
                  // });
                  sendVerificationEmail(result, res);
                })
                .catch((err) => {
                  res.json({
                    staus: "FAILED",
                    message:
                      "An error occured while registering the Class Counseller.",
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
          message: "Error occured while checking for the existing ClassCC!",
        });
      });
  }
});

//verification email route
router.get("/verify/:classCCId/:uniqueString", (req, res) => {
  let { classCCId, uniqueString } = req.params;

  StudentVerification.find({ classCCId })
    .then((result) => {
      if (result.length > 0) {
        //user verification record exists so we proceed.
        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        //checking the expired unique string
        if (expiresAt < Date.now()) {
          CCVerification.deleteOne({ classCCId })
            .then((result) => {
              ClassCC.deleteOne({ _id: classCCId })
                .then(() => {
                  let message = "Link has expired please signup again.";
                  res.redirect(
                    `/class-cc/verified/error=true&message=${message}`
                  );
                })
                .catch((error) => {
                  console.log(error);
                  let message =
                    "Clearing class counseller with expired unique string failed.";
                  res.redirect(
                    `/class-cc/verified/error=true&message=${message}`
                  );
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while cleaning expired class counseller verification record";
              res.redirect(`/class-cc/verified/error=true&message=${message}`);
            });
        } else {
          //valid class-cc record exists so we validate the student string
          //First we compare the hashed unique string

          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //string matched
                ClassCC.updateOne({ _id: classCCId }, { verified: true })
                  .then(() => {
                    CCVerification.deleteOne({ classCCId })
                      .then(() => {
                        res.sendFile(
                          path.join(__dirname, "./../views/verified.html")
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message =
                          "An error occured while finalising the successful verification.";
                        res.redirect(
                          `/class-cc/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message =
                      "An error occured while updating the record to show verified.";
                    res.redirect(
                      `/class-cc/verified/error=true&message=${message}`
                    );
                  });
              } else {
                //existing record but incorrect verification details passed.
                let message =
                  "Invalid verification details passed. Check your inbox.";
                res.redirect(
                  `/class-cc/verified/error=true&message=${message}`
                );
              }
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while comparing the unique strings";
              res.redirect(`/class-cc/verified/error=true&message=${message}`);
            });
        }
      } else {
        //user verification record doesn't exists.
        let message =
          "Account record doesn't exists or has been verified already. Please sign up or log in.";
        res.redirect(`/class-cc/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "An error occured while checking for existing user verification record";
      res.redirect(`/class-cc/verified/error=true&message=${message}`);
    });
});

///verified page route
router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "./../views/verified.html"));
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
    ClassCC.find({ email: { $eq: email } })
      .then((data) => {
        if (data.length) {
          //cc exists

          //check if user is verified.
          if (!data[0].verified) {
            res.json({
              status: "FAILED",
              message:
                "Email hasn't been verified yet. Please check your inbox.",
            });
          } else {
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
          }
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
          message: "An error occurred while checking for exisiting ClassCC.",
        });
      });
  }
});

module.exports = router;
