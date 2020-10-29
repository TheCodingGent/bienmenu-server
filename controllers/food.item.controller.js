const db = require("../models");
const User = db.user;
const FoodItem = db.foodItem;
const FoodItemBank = db.foodItemBank;

const AWS = require("aws-sdk");
const { ObjectId } = require("mongodb");
const MenuBank = require("../models/MenuBank");

const AWSID = process.env.AWS_ACCESS_KEY_ID;
const AWSSECRET = process.env.AWS_SECRET_KEY;

const BUCKET_NAME = process.env.S3_MAIN_BUCKET;

const s3 = new AWS.S3({
  accessKeyId: AWSID,
  secretAccessKey: AWSSECRET,
});

// get food item by id
exports.getFoodItemById = (req, res) => {
  const foodItemId = req.params.id;

  FoodItem.findOne({ _id: foodItemId }).exec(function (err, foodItem) {
    if (err) {
      console.log(
        `An error occurred while retrieving food item ${foodItemId}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else if (foodItem === null) {
      res.status(404);
      res.send({
        status: "error",
        msg: `Food Item ${foodItemId} not found`,
      });
    } else {
      res.send(foodItem);
    }
  });
};

// get food items for user
exports.getFoodItemsForUser = async (req, res) => {
  var userId = req.userId;
  var user;
  var foodItemBank;

  try {
    // get the user from the database
    user = await User.findById(userId).exec();

    // if user not found return 404
    if (!user) {
      return res.status(404).send({ status: "error", msg: "User not found" });
    }

    // populate the user food bank
    foodItemBank = await FoodItemBank.findById(user.foodItemBank._id)
      .populate("foodItems")
      .exec();

    // if food bank not found return 404
    if (!foodItemBank) {
      return res
        .status(404)
        .send({ status: "error", msg: "No food item bank found" });
    }

    console.log(`Food items successfully retrieved for user ${userId}`);
    res.status(200).send({
      status: "success",
      foodItems: foodItemBank.foodItems,
    });
  } catch (err) {
    console.log(`An error occurred while retrieving food items for ${userId}`);
    res.status(500).send({ err, status: "error" });
    return;
  }
};

// add a new food item
exports.addFoodItem = (req, res) => {
  var foodItem = new FoodItem(req.body);

  foodItem.save(function (err, foodItem) {
    if (err) {
      console.log(
        `An error occurred while adding food item ${foodItem.name}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      res.send({ status: "success", msg: "Food item added successfully!" });
    }
  });
};

// add a new food item for a user
exports.addFoodItemForUser = async (req, res) => {
  var userId = req.userId;
  var foodItem = new FoodItem(req.body);
  var user;

  try {
    // get the user from the database
    user = await User.findById(userId).exec();

    if (!user) {
      return res.status(404).send({ status: "error", msg: "User not found" });
    }

    // save food item to the food item collection
    await FoodItem.findByIdAndUpdate(foodItem._id, foodItem, {
      new: true,
      upsert: true, // Make this update into an upsert
    });

    // if item already exists in bank remove it
    await FoodItemBank.findByIdAndUpdate(
      { _id: user.foodItemBank._id },
      { $pull: { foodItems: foodItem._id } },
      { new: true }
    );

    // if food item was added successfully add the food item to the users food item bank
    await FoodItemBank.findOneAndUpdate(
      { _id: user.foodItemBank._id },
      { $push: { foodItems: foodItem._id } },
      { new: true }
    );

    console.log(
      `Added food item ${foodItem.name} to user ${user.username} successfully.`
    );

    res.send({
      status: "success",
      msg: "Food item and user have been updated successfully!",
    });
  } catch (err) {
    console.log(
      `An error occurred while updating food item ${foodItem.name} into the database`
    );
    res.status(500).send({ err, status: "error" });
    return;
  }
};

exports.deleteFoodItem = async (req, res) => {
  var userId = req.userId;
  var foodItemId = req.body.foodItemId;
  var user;

  try {
    // delete food item to the food item collection
    await FoodItem.findByIdAndDelete(foodItemId);

    // get the user from the database
    user = await User.findById(userId).exec();

    if (!user) {
      return res.status(404).send({ status: "error", msg: "User not found" });
    }

    // delete food item from foodbank for current user potentially delete in all food banks in the future
    await FoodItemBank.findByIdAndUpdate(
      { _id: user.foodItemBank._id },
      { $pull: { foodItems: foodItemId } },
      { new: true }
    );

    await emptyS3Directory(BUCKET_NAME, `foodItems/${foodItemId}`);

    console.log(`Deleted food item ${foodItemId} successfully.`);

    res.send({
      status: "success",
      msg: "Food item deleted successfully!",
    });
  } catch (err) {
    console.log(
      `An error occurred while deleting food item ${foodItem.name} from the database`
    );
    res.status(500).send({ err, status: "error" });
    return;
  }
};

// Helper
async function emptyS3Directory(bucket, dir) {
  const listParams = {
    Bucket: bucket,
    Prefix: dir,
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(bucket, dir);
}
