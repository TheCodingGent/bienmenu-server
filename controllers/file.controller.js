const Busboy = require("busboy");
const AWS = require("aws-sdk");

const AWSID = process.env.AWS_ACCESS_KEY_ID;
const AWSSECRET = process.env.AWS_SECRET_KEY;

const BUCKET_NAME = "bienmenu";

const s3 = new AWS.S3({
  accessKeyId: AWSID,
  secretAccessKey: AWSSECRET,
});

// get a pdf file of a menu given its name and restaurant id to which it belongs
exports.getMenuFile = (req, res) => {
  const restaurantId = req.params.id; //use restaurant document id for uniqueness
  const filename = req.params.filename;

  console.log(
    `Received request to retrieve menu file ${filename} for restaurant ${restaurantId}`
  );

  var fileKey = `menus/${restaurantId}/${filename}.pdf`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  var s3Stream = s3.getObject(params).createReadStream();

  // Listen for errors returned by the service
  s3Stream.on("error", function (err) {
    // NoSuchKey: The specified key does not exist
    console.error(`An error occurred while reading data from S3: ${err}`);
    res.status(500).send({ err, status: "error" });
  });

  s3Stream
    .pipe(res)
    .on("error", function (err) {
      // capture any errors that occur when writing data to the file
      console.error(`An error occurred in the output filestream: ${err}`);
      res.status(500).send({ err, status: "error" });
    })
    .on("close", function () {
      console.log(`File ${filename} retrieved successfully!`);
    });
};

// get image file from the server
exports.getImageFile = (req, res) => {
  const foodItemId = req.params.id;
  const filename = req.params.filename;

  var fileKey = `foodItems/${foodItemId}/${filename}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
  };

  var s3Stream = s3.getObject(params).createReadStream();

  // Listen for errors returned by the service
  s3Stream.on("error", function (err) {
    // NoSuchKey: The specified key does not exist
    console.error(`An error occurred while reading data from S3: ${err}`);
    res.status(500).send({ err, status: "error" });
  });

  s3Stream
    .pipe(res)
    .on("error", function (err) {
      // capture any errors that occur when writing data to the file
      console.error(`An error occurred in the output filestream: ${err}`);
      res.status(500).send({ err, status: "error" });
    })
    .on("close", function () {
      console.log(`File ${filename} retrieved successfully!`);
    });
};

// upload a PDF file to the server
exports.uploadMenuFile = (req, res) => {
  const restaurantId = req.params.id;
  console.log(`Received request to upload menu for restaurant ${restaurantId}`);

  let chunks = [],
    fname,
    ftype,
    fEncoding;

  let busboy = new Busboy({ headers: req.headers });
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    console.log(
      "File [" +
        fieldname +
        "]: filename: " +
        filename +
        ", encoding: " +
        encoding +
        ", mimetype: " +
        mimetype
    );

    fname = filename;
    ftype = mimetype;
    fEncoding = encoding;
    file.on("data", function (data) {
      // pull all chunk to an array and later concat it.
      chunks.push(data);
    });

    file.on("end", function () {
      console.log("File [" + filename + "] Finished");
    });
  });

  busboy.on("finish", function () {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `menus/${restaurantId}/${fname}`,
      Body: Buffer.concat(chunks), // concatinating all chunks
      ContentEncoding: fEncoding, // optional
      ContentType: ftype, // required
      ACL: "public-read",
    };

    // we are sending buffer data to s3.
    s3.upload(params, (err, s3res) => {
      if (err) {
        console.log(`An error occurred while uploading file to S3: ${err}`);
        res.send({ err, status: "error" });
      } else {
        console.log(`Menu file uploaded successfully`);
        res.send({
          //   data: s3res,
          status: "success",
          msg: "Menu file successfully uploaded.",
        });
      }
    });
  });

  return req.pipe(busboy);
};

exports.uploadImageFile = (req, res) => {
  const path = req.params.path;
  const id = req.params.id;

  const key = `${path}/${id}`;

  console.log(key);

  let chunks = [],
    fname,
    ftype,
    fEncoding;

  let busboy = new Busboy({ headers: req.headers });
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    console.log(
      "File [" +
        fieldname +
        "]: filename: " +
        filename +
        ", encoding: " +
        encoding +
        ", mimetype: " +
        mimetype
    );

    fname = filename;
    ftype = mimetype;
    fEncoding = encoding;
    file.on("data", function (data) {
      // pull all chunk to an array and later concat it.
      chunks.push(data);
    });

    file.on("end", function () {
      console.log("File [" + filename + "] Finished");
    });
  });

  busboy.on("finish", function () {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `${key}/${fname}`,
      Body: Buffer.concat(chunks), // concatinating all chunks
      ContentEncoding: fEncoding, // optional
      ContentType: ftype, // required
      ACL: "public-read",
    };

    // we are sending buffer data to s3.
    s3.upload(params, (err, s3res) => {
      if (err) {
        console.log(
          `An error occurred while uploading food item image to S3: ${err}`
        );
        res.send({ err, status: "error" });
      } else {
        console.log(`Image file uploaded successfully`);
        res.send({
          //   data: s3res,
          status: "success",
          msg: "Image file successfully uploaded.",
        });
      }
    });
  });

  return req.pipe(busboy);
};
