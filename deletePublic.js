import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" }); // Replace with your actual region

export const handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const bucketName = event.Records[0].s3.bucket.name;
    const processedFolderKey = event.Records[0].s3.object.key;
    const filename = processedFolderKey.split("/").pop();
    const publicFileKey = `public-uploads/${filename}`;

    console.log(
      `Attempting to delete: ${publicFileKey} from bucket: ${bucketName}`
    );

    // Using AWS SDK v3
    const deleteParams = {
      Bucket: bucketName,
      Key: publicFileKey,
    };

    await s3.send(new DeleteObjectCommand(deleteParams));

    console.log(`Deleted: ${publicFileKey} from bucket: ${bucketName}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File deleted successfully" }),
    };
  } catch (error) {
    console.error(`Failed to process delete: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
