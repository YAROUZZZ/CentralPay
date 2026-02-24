const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const router = express.Router();

//const upload = multer({ dest: "uploads/" });



const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage: storage });



router.post("/receipts", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const formData = new FormData();
    //formData.append("file", fs.createReadStream(req.file.path));




formData.append(
  "file",
  fs.createReadStream(req.file.path),
  req.file.filename
);



    const response = await axios.post(
      "https://shahd11037-receiptocr.hf.space/process-receipt",
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      extracted_data: response.data.data
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error processing receipt"
    });
  }
});

module.exports = router;
