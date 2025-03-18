const { S3Client } = require("@aws-sdk/client-s3");
const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { Worker } = require("worker_threads");
const path = require("path");
const PORT = 5000;

require("dotenv").config();

const app = express();
app.use(express.static("public"));
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `public-uploads/${Date.now()}-${file.originalname}`);
    },
  }),
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const worker = new Worker("./imageProcess.js", {
    workerData: {
      imgUrl: req.file.location,
      key: req.file.key,
    },
  });
  worker.on("message", (message) => {
    console.log(message);
    // if (message.status === "success") {
    //   res.json({
    //     message: "Upload successful, processing started",
    //     imgUrl: message.response.Location,
    //   });
    // }
  });
  worker.on("error", (error) => {
    console.error("Worker Error:", error);
  });

  worker.on("exit", (code) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
  });
  res.json({
    message: "Upload successful, processing started",
    file: req.file.location,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
