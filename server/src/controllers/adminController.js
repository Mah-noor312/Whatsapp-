const User = require("../models/User");
const generateInviteToken = require("../utils/generateInviteToken");
const hashToken = require("../utils/hashToken");
const transporter = require("../config/mailer");

const sendSetupEmail = async (user) => {
  const rawToken = generateInviteToken();
  const hashedToken = hashToken(rawToken);

  user.inviteTokenHash = hashedToken;
  user.inviteExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await user.save();

  const setupLink = `${process.env.CLIENT_URL}/set-password/${rawToken}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: "Set your account password",
    html: `
      <h2>Your account has been created</h2>
      <p>Username: ${user.username}</p>
      <p>Email: ${user.email}</p>
      <p>This password setup link will expire in 15 minutes.</p>
      <p>Click below to set your password:</p>
      <a href="${setupLink}">${setupLink}</a>
    `,
  });
};

const createUserByAdmin = async (req, res) => {
  try {
    const { username, email } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      role: "user",
      isPasswordSet: false,
      inviteTokenHash: null,
      inviteExpiresAt: null,
    });

    await sendSetupEmail(user);

    return res.status(201).json({
      message: "User created and setup email sent",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-passwordHash");
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resendSetupEmail = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "user") {
      return res
        .status(400)
        .json({ message: "Resend email is only for normal users" });
    }

    await sendSetupEmail(user);

    return res.json({ message: "Setup email resent successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { createUserByAdmin, getAllUsers, resendSetupEmail };