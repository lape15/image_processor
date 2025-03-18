const { isMainThread, parentPort, workerData } = require("worker_threads");
const AWS = require("aws-sdk");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const sizes = [
  // { suffix: "small", width: 200 },
  { suffix: "medium", width: 500 },
  // { suffix: "large", width: 800 },
];

async function processImage() {
  const { imgUrl, key } = workerData;
  try {
    const response = await fetch(imgUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    for (const size of sizes) {
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize(size.width)
        .toBuffer();
      const newKey = `processed/${size.suffix}/${path.basename(key)}`;

      const res = await s3
        .upload({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: newKey,
          Body: resizedImageBuffer,
          ContentType: "image/jpeg",
        })
        .promise();

      parentPort.postMessage({
        status: "success",
        size: size.suffix,
        key: newKey,
        response: res,
      });
      parentPort.close();
    }
  } catch (err) {
    parentPort.postMessage({ status: "error", error: err.message });
  }
}

processImage();
