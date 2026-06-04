const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedAdmin = async () => {
  const existingAdmin = await User.findOne({ email: "admin@gmail.com" });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await User.create({
      username: "admin",
      email: "admin@gmail.com",
      passwordHash: hashedPassword,
      role: "admin",
      isPasswordSet: true,
    });

    console.log("Default admin created");
  } else {
    console.log("Admin already exists");
  }
};

module.exports = seedAdmin;