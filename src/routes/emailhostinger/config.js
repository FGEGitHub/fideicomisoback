const nodemailer = require("nodemailer");
const { email } = require("../keys");

const transporter = nodemailer.createTransport({
  host: email.host,
  port: email.port,
  secure: email.secure,
  auth: {
    user: email.user,
    pass: email.pass
  }
});

module.exports = transporter;