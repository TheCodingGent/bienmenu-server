const { menu } = require("../models");
const db = require("../models");
const Restaurant = require("../models/Restaurant");
const AWS = require("aws-sdk");
const Menu = db.menu;
const MenuBank = db.menuBank;

const AWSID = process.env.AWS_ACCESS_KEY_ID;
const AWSSECRET = process.env.AWS_SECRET_KEY;

const BUCKET_NAME = "bienmenu";

const s3 = new AWS.S3({
  accessKeyId: AWSID,
  secretAccessKey: AWSSECRET,
});
// get menu by id
exports.getMenuById = (req, res) => {
  const menuId = req.params.id;

  Menu.findOne({
    _id: menuId,
  })
    .populate("sections.menuSectionItems.foodItem")
    .exec(function (err, menu) {
      if (err) {
        console.log(
          `An error occurred while retrieving menu ${menuId}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
      } else if (menu === null) {
        res.status(404);
        res.send({
          status: "error",
          msg: `Menu ${menuId} not found`,
        });
      } else {
        res.send(menu);
      }
    });
};

exports.addMenu = (req, res) => {
  var menu = new Menu(req.body);

  menu.save(function (err, menu) {
    if (err) {
      console.log(`An error occurred while adding menu ${menu.name}: ${err}`);
      res.status(500);
      res.send({
        status: "error",
        err,
      });
    } else {
      res.send({
        status: "success",
        msg: "menu added successfully!",
      });
    }
  });
};

// add a new menu for a restaurant
exports.addMenuForRestaurant = async (req, res) => {
  var restaurantId = req.params.restaurantId;
  var menu = new Menu(req.body);
  var restaurant;

  try {
    // get the restaurant from the database
    restaurant = await Restaurant.findById(restaurantId).exec();
    if (!restaurant) {
      return res.status(404).send({
        status: "error",
        msg: "Restaurant not found",
      });
    }

    // save menu to the menu collection
    await Menu.findByIdAndUpdate(menu._id, menu, {
      new: true,
      upsert: true, // Make this update into an upsert
    });

    // if menu already exists in bank remove it
    await MenuBank.findByIdAndUpdate(
      {
        _id: restaurant.menuBank._id,
      },
      {
        $pull: {
          menus: menu._id,
        },
      },
      {
        new: true,
      }
    );

    // if menu was added successfully add the menu to the restaurant menu bank
    await MenuBank.findOneAndUpdate(
      {
        _id: restaurant.menuBank._id,
      },
      {
        $push: {
          menus: menu._id,
        },
      },
      {
        new: true,
      }
    );

    console.log(
      `Added menu ${menu.name} to restaurant ${restaurant.name} successfully.`
    );

    res.send({
      status: "success",
      msg: "menu and restaurant have been updated successfully!",
    });
  } catch (err) {
    console.log(
      `An error occurred while updating menu ${menu.name} into the database`
    );
    res.status(500).send({
      err,
      status: "error",
    });
    return;
  }
};

exports.updateMenuStatus = async (req, res) => {
  const menuId = req.params.menuId;

  Menu.findById(menuId).exec((err, menu) => {
    if (err) {
      res.status(500).send({
        status: "error",
        err,
      });
      return;
    }

    menu.isActive = req.body.isActive;

    menu.save(function (err, menu) {
      if (err) {
        console.log(
          `An error occurred while updating menu status for menu ${menu.name}: ${err}`
        );
        res.status(500);
        res.send({
          status: "error",
          err,
        });
      } else {
        res.send({
          status: "success",
          msg: "Menu status updated successfully!",
        });
      }
    });
  });
};

exports.deleteMenu = async (req, res) => {
  var menu = req.body.menu;
  var restaurantId = req.params.restaurantId;
  var restaurant;

  try {
    // delete menu from menu collection
    await Menu.findByIdAndDelete(menu._id);

    // get the restaurant from the database
    restaurant = await Restaurant.findById(restaurantId).exec();

    if (!restaurant) {
      return res.status(404).send({
        status: "error",
        msg: "Restaurant not found",
      });
    }

    // delete menufrom menubank for current restaurant potentially delete in all menu banks in the future
    await MenuBank.findByIdAndUpdate(
      {
        _id: restaurant.menuBank._id,
      },
      {
        $pull: {
          menus: menu._id,
        },
      }
    );

    console.log(`Deleted menu ${menu._id} successfully.`);
    if (menu.type === "0") {
      // upon successful deletion from the database delete file from cloud storage
      var fileKey = `menus/${restaurantId}/${menu.filename}.pdf`;
      var params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
      };

      // delete file from AWS
      s3.deleteObject(params, function (err, data) {
        if (err) {
          console.log(
            `An error occurred while trying to delete the menu ${menu.name} file: ${err}`
          );
          res.status(500).send({
            error: err,
          });
        }
        // menu file successfully deleted from AWS and from database
        else {
          res.send({
            status: "success",
            msg: "Menu deleted successfully!",
          });
        }
      });
    } else {
      res.send({
        status: "success",
        msg: "menu deleted successfully!",
      });
    }
  } catch (err) {
    console.log(
      `An error occurred while deleting menu ${menu.name} into the database`
    );
    res.status(500).send({
      err,
      status: "error",
    });
    return;
  }
};

// // get menus for restaurant
// exports.getMenusForRestaurant = async (req, res) => {
//     const restaurantId = req.params.restaurantId;
//     var restaurant;
//     var menuBank;

//     try {
//         // get the restaurant from the database
//         restaurant = await Restaurant.findById(restaurantId).exec();

//         // if restaurant not found return 404
//         if (!restaurant) {
//             return res.status(404).send({
//                 status: "error",
//                 msg: "Restaurant not found",
//             });
//         }

//         // populate the restaurant menu bank
//         menuBank = await MenuBank.findById(restaurant.menuBank._id)
//             .populate("menus")
//             // .populate({
//             //     path: 'biemenuMenus',
//             //     model: Menu,
//             //     populate: {
//             //         path: 'sections.menuSectionItems.foodItem',
//             //         model: FoodItem
//             //     }
//             // })

//             .exec();

//         // if menu bank not found return 404
//         if (!menuBank) {
//             return res.status(404).send({
//                 status: "error",
//                 msg: "No menu bank found",
//             });
//         }

//         console.log(`menus successfully retrieved for restaurant ${restaurantId}`);
//         res.status(200).send({
//             status: "success",
//             menus: menuBank.menus,
//         });
//     } catch (err) {
//         console.log(`An error occurred while retrieving menus for ${restaurantId}`);
//         res.status(500).send({
//             err,
//             status: "error",
//         });
//         return;
//     }
// };

// add a new menu
