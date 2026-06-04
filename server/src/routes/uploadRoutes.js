const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.includes(".") ? file.originalname.split(".").pop() : "";
    const baseName = file.originalname.includes(".") ? file.originalname.replace("." + ext, "") : file.originalname;
    const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, cleanName + "-" + uniqueSuffix + (ext ? "." + ext : ""));
  },
});
const upload = multer({ storage: storage });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file received" });
    }

    console.log("FILE RECEIVED:", req.file); // DEBUG

    let resourceType = "auto";
    if (req.file.mimetype === "application/pdf" || req.file.originalname.match(/\.(pdf|doc|docx|txt|zip|rar)$/i)) {
      resourceType = "raw";
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType,
      use_filename: true,
      unique_filename: false
    });

    fs.unlinkSync(req.file.path);

    return res.json({
      url: result.secure_url,
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;