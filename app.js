const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'darrelmucheri@gmail.com',
    pass: 'oxwp xfyj whaz cvzz',
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOTP(email, otp) {
  let data = {};
  const OTP_STORAGE = './otp.json';
  if (fs.existsSync(OTP_STORAGE)) {
    data = JSON.parse(fs.readFileSync(OTP_STORAGE, 'utf8'));
  }
  data[email] = { otp, timestamp: Date.now() };
  fs.writeFileSync(OTP_STORAGE, JSON.stringify(data, null, 2));
}

function validateOTP(email, otp) {
  const OTP_STORAGE = './otp.json';
  if (!fs.existsSync(OTP_STORAGE)) return false;

  const data = JSON.parse(fs.readFileSync(OTP_STORAGE, 'utf8'));
  if (!data[email]) return false;

  const { otp: savedOtp, timestamp } = data[email];
  const isValid = savedOtp === otp && Date.now() - timestamp <= 5 * 60 * 1000;

  if (isValid) {
    delete data[email];
    fs.writeFileSync(OTP_STORAGE, JSON.stringify(data, null, 2));
  }
  return isValid;
}

async function sendEmailOTP(email, otp) {
  const mailOptions = {
    from: '"Subzero Support" <support@mrfrank.site>',
    to: email,
    subject: 'Your OTP Code',
    text: `Hi there !\n\nYour OTP code is ${otp}. It is valid for 5 minutes. Do not share it.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Failed to send OTP: ${error.message}`);
  }
}

app.post('/generate', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const otp = generateOTP();
  saveOTP(email, otp);

  try {
    await sendEmailOTP(email, otp);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send OTP', error: error.message });
  }
});

app.post('/validate', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

  const isValid = validateOTP(email, otp);
  if (isValid) {
    res.json({ success: true, message: 'OTP is valid' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
