const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  console.log("Email config:", {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD ? "***" : "MISSING",
  });

  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Define the email options
  const mailOptions = {
    from: "support@natours.com",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  console.log("Sending email to:", options.email);

  // 3) Actually send the email
  try { 
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);
    return info;
  } catch (error) {
    console.error("Email sending error details:", error.message);
    console.error("Full error:", error);
    throw error;
  }
};

module.exports = sendEmail;
