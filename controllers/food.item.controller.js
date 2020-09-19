const db = require("../models");
const User = db.user;
const FoodItem = db.foodItem;
const FoodItemBank = db.foodItemBank;

const AWS = require("aws-sdk");
const { ObjectId } = require("mongodb");

const AWSID = process.env.AWS_ACCESS_KEY_ID;
const AWSSECRET = process.env.AWS_SECRET_KEY;

const BUCKET_NAME = "bienmenu";

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
