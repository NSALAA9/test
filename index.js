const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  try {
    const bucketName = event.Records[0].s3.bucket.name;
    const objectKey = event.Records[0].s3.object.key;

    if (!objectKey.endsWith('.jpg') && !objectKey.endsWith('.png') && !objectKey.endsWith('.gif')) {
      return { statusCode: 400, body: 'Unsupported file type.' };
    }

    const imageMetadata = await getImageMetadata(bucketName, objectKey);
    const imagesJson = await getImagesJson(bucketName);

    const existingImageIndex = imagesJson.findIndex(image => image.name === imageMetadata.name);

    if (existingImageIndex !== -1) {
      imagesJson[existingImageIndex] = imageMetadata;
    } else {
      imagesJson.push(imageMetadata);
    }

    await uploadImagesJson(bucketName, imagesJson);

    return { statusCode: 200, body: 'Image metadata processed successfully.' };
  } catch (err) {
    console.error('Error processing image metadata:', err);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};

function getImageMetadata(bucketName, objectKey) {
  const params = { Bucket: bucketName, Key: objectKey };
  return s3.headObject(params).promise()
    .then(data => ({
      name: objectKey.split('/').pop(),
      size: data.ContentLength,
      type: data.ContentType,
      // Add more metadata properties as needed
    }));
}

function getImagesJson(bucketName) {
  const params = { Bucket: bucketName, Key: 'images.json' };
  return s3.getObject(params).promise()
    .then(data => JSON.parse(data.Body.toString()))
    .catch(() => []);
}

function uploadImagesJson(bucketName, imagesJson) {
  const params = {
    Bucket: bucketName,
    Key: 'images.json',
    Body: JSON.stringify(imagesJson),
    ContentType: 'application/json'
  };
  return s3.putObject(params).promise();
}
