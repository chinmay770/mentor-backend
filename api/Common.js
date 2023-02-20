const express = require("express");
const router = express.Router();
require("dotenv").config();

//model import for messages.
const Message = require("../models/Common/Message");

//model import for counselling.
const Counselling = require("../models/Common/Counselling");

//email handlers imported here
const nodemailer = require("nodemailer");


router.post("/contact-us", (req, res) => {
  //nodemailer transporter stuff
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS,
    },
  });

  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: req.body.email,
    subject: "Ramrao Adik Institute of Technology (Mentoring Department).",
    text: req.body.message,
    html: `
    <div style="padding:10px;border-style: ridge;">

    <h1 style="color: #820000;">RAMRAO ADIK INSTITUTE OF TECHNOLOGY.</h1>

    <p>Thank you for posting your query. We will be going through your query as soon as possible.</p>
    <p>We will try to respond you within 2-3 working days. Thank you!</p>
    <h3>Contact Details</h3>
    <ul>
      <li><b>Name</b> : ${req.body.firstName} ${req.body.lastName}</li>
      <li><b>Email</b> : ${req.body.email}</li>
      <li><b>Mobile Number</b> : ${req.body.mobile}</li>
    </ul>

    <h4>Your Query message is as follows.</h4>
    <p><b>Message</b>: ${req.body.message}</p>

    <hr>
    
    <p>Regards - Ramrao Adik Institute of Technology (Mentoring Department).</p>
    
    <footer>
    <small style="text-align: center;">© ${new Date().getFullYear()} Ramrao Adik Institute of Technology.</small>
    </footer>
    </div>
    `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      res.json({
        status: true,
        message: "Error in the code",
      });
    } else {
      res.json({
        status: true,
        message: "Email sent successfully",
      });
    }
  });

  //model insertion for messages.

  let { firstName, lastName, email, mobile, message } = req.body;

  if (
    firstName == "" ||
    lastName == "" ||
    email == "" ||
    mobile == "" ||
    message == ""
  ) {
    res.json({
      status: "FAILED",
      message: "Empty inputs are not allowed.",
    });
  } else {
    const newMessage = new Message({
      firstName,
      lastName,
      email,
      mobile,
      message,
    });

    newMessage
      .save()
      .then(
        res.json({
          status: "SUCCESS",
          message: "Message saved successfully.",
        })
      )
      .catch((err) =>
        res.json({
          status: "FAILED",
          message: "An error occured while saving message.",
        })
      );
  }
});

module.exports = router;
