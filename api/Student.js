const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
// const upload = require("../middleware/upload");
const multer = require("multer");
require("dotenv").config();

//path for static verified page
const path = require("path");

router.use(express.static(__dirname + "./public/"));

//importing mongoose model file
const Student = require("../models/Students/Student");

//verification model file imported
const StudentVerification = require("../models/Students/StudentVerification");

//forgot password model file import
const StudentForgotPassword = require("../models/Students/StudentPasswordReset");

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
      currentUrl + "student/verify/" + _id + "/" + uniqueString
    }>here</a> to proceed.</p>`,
  };

  //hash the uniqueString
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      //setting values in userVerification Schema
      const newVerification = new StudentVerification({
        studentId: _id,
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
    //check if Student is already present in the database.
    Student.find({ email: { $eq: email } })
      .then((result) => {
        if (result.length) {
          //check if already exists a Student
          res.json({
            status: "FAILED",
            message: "Student with email already exists!",
          });
        } else {
          //create a new Student

          //hashing the password for better security
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newStudent = new Student({
                name,
                email,
                password: hashedPassword,
                verified: false,
              });

              newStudent
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
                    message: "An error occured while registering the Student.",
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
          message: "Error occured while checking for the existing Student!",
        });
      });
  }
});

//verification email route
router.get("/verify/:studentId/:uniqueString", (req, res) => {
  let { studentId, uniqueString } = req.params;

  StudentVerification.find({ studentId })
    .then((result) => {
      if (result.length > 0) {
        //user verification record exists so we proceed.
        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        //checking the expired unique string
        if (expiresAt < Date.now()) {
          StudentVerification.deleteOne({ studentId })
            .then((result) => {
              Student.deleteOne({ _id: studentId })
                .then(() => {
                  let message = "Link has expired please signup again.";
                  res.redirect(
                    `/student/verified/error=true&message=${message}`
                  );
                })
                .catch((error) => {
                  console.log(error);
                  let message =
                    "Clearing student with expired unique string failed.";
                  res.redirect(
                    `/student/verified/error=true&message=${message}`
                  );
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while cleaning expired user verification record";
              res.redirect(`/student/verified/error=true&message=${message}`);
            });
        } else {
          //valid student record exists so we validate the student string
          //First we compare the hashed unique string

          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                //string matched
                Student.updateOne({ _id: studentId }, { verified: true })
                  .then(() => {
                    StudentVerification.deleteOne({ studentId })
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
                          `/student/verified/error=true&message=${message}`
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message =
                      "An error occured while updating the record to show verified.";
                    res.redirect(
                      `/student/verified/error=true&message=${message}`
                    );
                  });
              } else {
                //existing record but incorrect verification details passed.
                let message =
                  "Invalid verification details passed. Check your inbox.";
                res.redirect(`/student/verified/error=true&message=${message}`);
              }
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while comparing the unique strings";
              res.redirect(`/student/verified/error=true&message=${message}`);
            });
        }
      } else {
        //user verification record doesn't exists.
        let message =
          "Account record doesn't exists or has been verified already. Please sign up or log in.";
        res.redirect(`/student/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "An error occured while checking for existing user verification record";
      res.redirect(`/student/verified/error=true&message=${message}`);
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
    Student.find({ email: { $eq: email } })
      .then((data) => {
        if (data.length) {
          //user exists

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
          message: "An error occurred while checking for exisiting Student.",
        });
      });
  }
});

//forgot-password route

router.post("/forgot-password", (req, res) => {
  const { email, redirectUrl } = req.body;

  Student.find({ email })
    .then((data) => {
      if (data.length) {
        //user exists

        //check if it is verified.
        if (!data[0].verified) {
          res.json({
            status: "FAILED",
            message: "Email hasn't been verified yet. Please check your inbox.",
          });
        } else {
          //proceed with email.
          sendResetEmail(data[0], redirectUrl, res);
        }
      } else {
        res.json({
          status: "FAILED",
          message: `No account with such email exists!`,
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: `Error occured while checking for the existing ${dbUserType}!`,
      });
    });
});

const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;

  //First we clear all the exisiting records.
  StudentForgotPassword.deleteMany({ studentId: _id })
    .then((result) => {
      //reset passwords records deleted successfully.
      //now we send the email

      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Reset your Password",
        html: `<p>We have seen the request for reseting the password.</p>
      <p>Please click the below link to reset your password</p>.
      <p>This link will expire in <b>60 minutes</b></p>.
      <p>Press 
      <a href=${
        redirectUrl + "/" + _id + "/" + resetString
      }>here</a> to proceed.</p>`,
      };

      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          const newPasswordReset = new StudentForgotPassword({
            studentId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
          });

          newPasswordReset
            .save()
            .then(() => {
              transporter
                .sendMail(mailOptions)
                .then(() => {
                  //reset email sent and password record saved successfully.
                  res.json({
                    status: "PENDING",
                    message: "Password reset email sent.",
                  });
                })
                .catch((error) => {
                  console.log(error);
                  res.json({
                    status: "FAILED",
                    message: "Password reset email failed.",
                  });
                });
            })
            .catch((err) => {
              console.log(err);
              res.json({
                status: "FAILED",
                message: "Couldn't save password reset data!",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.json({
            status: "FAILED",
            message: "An error occured while hashing the reseted password.",
          });
        });
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Clearing exisiting password record failed!",
      });
    });
};

//actually reseting the password
router.post("/reset-password", (req, res) => {
  let { studentId, resetString, newPassword } = req.body;

  StudentForgotPassword.find({ studentId })
    .then((result) => {
      if (result.length > 0) {
        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;

        if (expiresAt < Date.now()) {
          StudentForgotPassword.deleteOne({ studentId })
            .then(() => {
              res.json({
                status: "FAILED",
                message: "Password reset link has expired",
              });
            })
            .catch((error) => {
              //deletion failed
              console.log(error);
              res.json({
                status: "FAILED",
                message: "Clearing password reset record failed.",
              });
            });
        } else {
          //vaild record exists so we compare the reset string and then reset the password.

          bcrypt
            .compare(resetString, hashedResetString)
            .then((result) => {
              if (result) {
                //string matched.
                //so hash the password.

                const saltRounds = 10;
                bcrypt
                  .hash(newPassword, saltRounds)
                  .then((hashedPassword) => {
                    //updating the user with new hashed password.

                    Student.updateOne(
                      { _id: studentId },
                      { password: hashedPassword }
                    )
                      .then(() => {
                        ///updating of password is completed now delete the password reset record.

                        StudentForgotPassword.deleteOne({ studentId })
                          .then(() => {
                            //both the student and reset record updated.

                            res.json({
                              status: "SUCCESS",
                              message: "Password has been reset successfully.",
                            });
                          })
                          .catch((error) => {
                            console.log(error);
                            res.json({
                              status: "FAILED",
                              message:
                                "An error occured while finalizing the password reset.",
                            });
                          });
                      })
                      .catch((error) => {
                        console.log(error);
                        res.json({
                          status: "FAILED",
                          message: "Updating user password failed.",
                        });
                      });
                  })
                  .catch((err) => {
                    console.log(err);
                    res.json({
                      status: "FAILED",
                      message: "Hashing of new passwords failed.",
                    });
                  });
              } else {
                //exisiting record but invalid reset password string

                res.json({
                  status: "FAILED",
                  message: "Invalid passwords details provided.",
                });
              }
            })
            .catch((err) => {
              console.log(err);
              res.json({
                status: "FAILED",
                message: "Comparing the reset password strings failed.",
              });
            });
        }
      } else {
        //password record doesn't exists
        res.json({
          status: "FAILED",
          message: "Password reset request not found",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.json({
        status: "FAILED",
        message: "Checking for exisiting reset password record failed.",
      });
    });
});

//profile section get data
router.get("/profile/:email", (req, res) => {
  let { email } = req.params;

  // console.log(email);

  if (email == "") {
    res.json({
      status: "FAILED",
      message: "Failed to load the data.",
    });
  } else {
    Student.find({ email: { $eq: email } })
      .then((data) => {
        if (data.length) {
          res.json({
            status: "SUCCESS",
            message: "Data found",
            studentData: data,
          });
        } else {
          res.json({
            status: "FAILED",
            message: "NO data found.",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          status: "FAILED",
          message: "An error occurred while checking for exisiting Student.",
        });
      });
  }
});

//profile section post data
router.post("/profile/:email", (req, res) => {
  let { email } = req.params;

  let { rollNumber, branch, divison, contactNumber } = req.body;

  rollNumber = rollNumber.trim();
  branch = branch.trim();
  divison = divison.trim();
  contactNumber = contactNumber.trim();

  if (
    rollNumber == "" ||
    branch == "" ||
    divison == "" ||
    contactNumber == ""
  ) {
    res.json({
      status: "FAILED",
      message: "Empty Credentials are not allowed.",
    });
  } else {
    Student.updateOne(
      { email: { $eq: email } },
      { $set: req.body },
      { multi: true },
      function (err, user) {
        console.log(`user: ${email} req.body:  ${JSON.stringify(req.body)}`);

        if (err) {
          return res.json({ success: false, msg: "Cannot Update User" });
        }
        if (!user) {
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        } else {
          res.json({
            success: true,
            msg: "User has been updated with new details",
          });
        }
      }
    );
  }
});

//messages routes
router.post("/message/:email", (req, res) => {
  let { email } = req.params;
  let { message, name } = req.body;

  message = message.trim();
  name = name.trim();

  let newMessage = { name: name, message: message };

  if (message == "") {
    res.json({
      status: "FAILED",
      message: "Empty Credentials are not allowed.",
    });
  } else {
    Student.updateOne(
      { email: { $eq: email } },
      { $push: { messages: newMessage } },
      { multi: true },
      function (err, user) {
        // console.log(`user: ${email} req.body:  ${JSON.stringify(req.body)}`);
        if (err) {
          return res.json({ success: false, msg: "Cannot Update User" });
        }
        if (!user) {
          return res
            .status(404)
            .json({ success: false, msg: "User not found" });
        } else {
          res.json({
            success: true,
            msg: "Message has been sent...",
          });
        }
      }
    );
  }
});

//achievements routes
// var Storage = multer.diskStorage({
//   destination: "./public/uploads/",
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });
// var upload = multer({
//   storage: Storage,
// }).single("imageFile");

const DIR = "./public/";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, uuidv4() + "-" + fileName);
  },
});

var upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

router.post(
  "/achievements/:email",
  upload.single("imageFile"),
  function (req, res, next) {
    let { email } = req.params;

    const url = req.protocol + "://" + req.get("host");

    fName = req.body.name;
    // imageFile = url + "/public/" + req.file.filename;
    description = req.body.description;

    let newAchivement = {
      name: fName,
      description: description,
      // imageFile: imageFile,
    };

    if (description == "" || fName == "") {
      res.json({
        status: "FAILED",
        message: "Empty Credentials are not allowed.",
      });
    } else {
      Student.updateOne(
        { email: { $eq: email } },
        { $push: { achievements: newAchivement } },
        { multi: true },
        function (err, user) {
          if (err) {
            return res.json({ success: false, msg: "Cannot Update User" });
          }
          if (!user) {
            return res
              .status(404)
              .json({ success: false, msg: "User not found" });
          } else {
            res.json({
              success: true,
              msg: "User has been updated with new Achivement",
            });
          }
        }
      );
    }
  }
);

router.post(
  "/academics/:email",
  upload.single("imageFile"),
  function (req, res, next) {
    let { email } = req.params;

    const url = req.protocol + "://" + req.get("host");

    activity = req.body.activity;
    activityName = req.body.activityName;
    // imageFile = url + "/public/" + req.file.filename;
    description = req.body.description;

    let newAcademic = {
      activity: activity,
      activityName: activityName,
      description: description,
      // imageFile: imageFile,
    };

    if (
      description == "" ||
      activity == "" ||
      // imageFile == "" ||
      activityName == ""
    ) {
      res.json({
        status: "FAILED",
        message: "Empty Credentials are not allowed.",
      });
    } else {
      Student.updateOne(
        { email: { $eq: email } },
        { $push: { academics: newAcademic } },
        { multi: true },
        function (err, user) {
          if (err) {
            return res.json({ success: false, msg: "Cannot Update User" });
          }
          if (!user) {
            return res
              .status(404)
              .json({ success: false, msg: "User not found" });
          } else {
            res.json({
              success: true,
              msg: "User has been updated with new Academic Detail",
            });
          }
        }
      );
    }
  }
);

router.post(
  "/semester-details/:email",
  upload.single("imageFile"),
  function (req, res, next) {
    let { email } = req.params;

    const url = req.protocol + "://" + req.get("host");

    semester = req.body.semester;
    cgpa = req.body.cgpa;
    year = req.body.year;
    kt = req.body.kt;
    attemptsForSem = req.body.attemptsForSem;
    clearedSemYear = req.body.clearedSemYear;
    // imageFile = url + "/public/" + req.file.filename;
    // description = req.body.description;

    let newSemesterDetail = {
      semester: semester,
      clearedSemYear: clearedSemYear,
      attemptsForSem: attemptsForSem,
      year: year,
      cgpa: cgpa,
      kt: kt,
      // imageFile: imageFile,
    };

    if (
      semester == "" ||
      clearedSemYear == "" ||
      attemptsForSem == "" ||
      year == "" ||
      cgpa == "" ||
      kt == ""
    ) {
      res.json({
        status: "FAILED",
        message: "Empty Credentials are not allowed.",
      });
    } else {
      Student.updateOne(
        { email: { $eq: email } },
        { $push: { semesterDetails: newSemesterDetail } },
        { multi: true },
        function (err, user) {
          if (err) {
            return res.json({ success: false, msg: "Cannot Update User" });
          }
          if (!user) {
            return res
              .status(404)
              .json({ success: false, msg: "User not found" });
          } else {
            res.json({
              success: true,
              msg: "User has been updated with new Achivement",
            });
          }
        }
      );
    }
  }
);

module.exports = router;
