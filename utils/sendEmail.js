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
    this.from = `Ahmed Arafa <${process.env.EMAIL_USER || "noreply@natours.io"}>`;
  }

  newTransport() {
    // For development, if no email credentials are set, use Ethereal
    if (
      process.env.NODE_ENV === "development" &&
      (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)
    ) {
      console.log("📧 Development mode: Creating Ethereal test account...");

      // Return a promise that resolves to a transport with test account
      return nodemailer.createTestAccount().then((testAccount) => {
        console.log("✅ Ethereal test account created");
        console.log(`   Email: ${testAccount.user}`);
        console.log(`   Password: ${testAccount.pass}`);

        const transport = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        // Store the test account for preview URL
        this.testAccount = testAccount;
        return transport;
      });
    }

    // Validate credentials for production
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.error("Missing email credentials!");
      console.error("EMAIL_USER:", emailUser ? "SET" : "NOT SET");
      console.error(
        "EMAIL_PASSWORD/EMAIL_PASS:",
        emailPass ? "SET" : "NOT SET",
      );
      throw new Error(
        "Email configuration incomplete. Check EMAIL_USER and EMAIL_PASSWORD in config.env",
      );
    }

    return Promise.resolve(
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        logger: process.env.NODE_ENV === "development",
        debug: process.env.NODE_ENV === "development",
      }),
    );
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
      text: htmlToText.convert(html),
    };

    // 3) Create a transport and send email
    const transport = await this.newTransport();
    const info = await transport.sendMail(mailOptions);

    // Log preview URL for Ethereal in development
    if (process.env.NODE_ENV === "development" && this.testAccount) {
      console.log("📧 Email preview URL:", nodemailer.getTestMessageUrl(info));
      console.log("🌐 View emails at: https://ethereal.email/messages");
    }

    return info;
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
}

module.exports = Email;
