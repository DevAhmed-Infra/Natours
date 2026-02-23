const nodemailer = require('nodemailer');

// Generate Ethereal email test account
const createTestAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ Ethereal test account created:');
    console.log('   Email:', testAccount.user);
    console.log('   Password:', testAccount.pass);
    console.log('   SMTP:', testAccount.smtp);
    console.log('\n📧 Add these to your config.env:');
    console.log(`ETHEREAL_USER=${testAccount.user}`);
    console.log(`ETHEREAL_PASS=${testAccount.pass}`);
    console.log('\n🌐 Preview emails at: https://ethereal.email/messages');
    return testAccount;
  } catch (err) {
    console.error('❌ Failed to create test account:', err);
  }
};

// Test email sending
const testEmail = async () => {
  const testAccount = await createTestAccount();
  
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: '"Natours Test" <test@natours.io>',
    to: testAccount.user,
    subject: 'Test Email from Natours',
    html: '<h1>Welcome to Natours!</h1><p>This is a test email.</p>',
  });

  console.log('✅ Test email sent!');
  console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
};

if (require.main === module) {
  testEmail();
}

module.exports = { createTestAccount, testEmail };
