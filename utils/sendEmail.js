// const nodemailer = require("nodemailer");

// const sendEmail = async (options) => {
//   // Validate credentials
//   if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
//     console.error("Missing email credentials!");
//     console.error("EMAIL_USER:", process.env.EMAIL_USER ? "SET" : "NOT SET");
//     console.error("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "SET" : "NOT SET");
//     throw new Error("Email configuration incomplete. Check EMAIL_USER and EMAIL_PASSWORD in config.env");
//   }

//   //

//   // 1) Create a transporter
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//     logger: true,
//     debug: true,
//   });

//   // 2) Define the email options
//   const mailOptions = {
//     from: `${process.env.EMAIL_USER}`,
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   console.log("Sending email to:", options.email);

//   // 3) Actually send the email
//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent successfully:", info);
//     return info;
//   } catch (error) {
//     console.error("Email sending error details:", error.message);
//     console.error("Full error:", error);
//     throw error;
//   }
// };

// module.exports = sendEmail;

const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Ahmed Arafa <${process.env.EMAIL_USER}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      logger: true,
      debug: true,
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours Family!");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)",
    );
  }
};

module.exports = Email;
