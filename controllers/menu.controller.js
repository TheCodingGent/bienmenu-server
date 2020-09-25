const db = require("../models");
const Restaurant = require("../models/Restaurant");
const Menu = db.menu;
const MenuBank = db.MenuBank;



// get menu by id
exports.getMenuById = (req, res) => {
    const menuId = req.params.id;

    Menu.findOne({
        _id: menuId
    }).exec(function (err, menu) {
        if (err) {
            console.log(
                `An error occurred while retrieving menu ${menuId}: ${err}`
            );
            res.status(500);
            res.send({
                status: "error",
                err
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

// get menus for restaurant
exports.getMenusForRestaurant = async (req, res) => {

    const restaurantId = req.params.id;
    var restaurant;
    var menuBank;

    try {
        // get the restaurant from the database
        restaurant = await Restaurant.findById(restaurantId).exec();

        // if restaurant not found return 404
        if (!restaurant) {
            return res.status(404).send({
                status: "error",
                msg: "Restaurant not found"
            });
        }

        // populate the restaurant menu bank
        menuBank = await MenuBank.findById(restaurant.menuBank._id)
            .populate("menus")
            .exec();

        // if menu bank not found return 404
        if (!menuBank) {
            return res
                .status(404)
                .send({
                    status: "error",
                    msg: "No menu bank found"
                });
        }

        console.log(`menus successfully retrieved for restaurant ${restaurantId}`);
        res.status(200).send({
            status: "success",
            menus: menuBank.menus,
        });
    } catch (err) {
        console.log(`An error occurred while retrieving menus for ${restaurantId}`);
        res.status(500).send({
            err,
            status: "error"
        });
        return;
    }
};

// add a new menu
exports.addMenu = (req, res) => {
    var menu = new Menu(req.body);

    menu.save(function (err, menu) {
        if (err) {
            console.log(
                `An error occurred while adding menu ${menu.name}: ${err}`
            );
            res.status(500);
            res.send({
                status: "error",
                err
            });
        } else {
            res.send({
                status: "success",
                msg: "menu added successfully!"
            });
        }
    });
};

// add a new menu for a restaurant
exports.addMenuForRestaurant = async (req, res) => {
    var restaurantId = req.body.restaurantId;
    var menu = new Menu(req.body);
    var restaurant;



    try {
        // get the restaurant from the database
        restaurant = await Restaurant.findById(restaurantId).exec();

        if (!restaurant) {
            return res.status(404).send({
                status: "error",
                msg: "Restaurant not found"
            });
        }

        // save menu to the menu collection
        await Menu.findByIdAndUpdate(menu._id, menu, {
            new: true,
            upsert: true, // Make this update into an upsert
        });

        // if menu already exists in bank remove it
        await MenuBank.findByIdAndUpdate({
            _id: restaurant.menuBank._id
        }, {
            $pull: {
                menus: menu._id
            }
        }, {
            new: true
        });

        // if menu was added successfully add the menu to the restaurant menu bank
        await MenuBank.findOneAndUpdate({
            _id: restaurant.MenuBank._id
        }, {
            $push: {
                menus: menu._id
            }
        }, {
            new: true
        });

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
            status: "error"
        });
        return;
    }
};

exports.deleteMenu = async (req, res) => {
    var menuId = req.body.menuId;
    var restaurantId = req.body.restaurantId;
    var restaurant;

    try {
        // delete menu from menu collection
        await Menu.findByIdAndDelete(menuId);

        // get the restaurant from the database
        restaurant = await Restaurant.findById(restaurantId).exec();

        if (!restaurant) {
            return res.status(404).send({
                status: "error",
                msg: "Restaurant not found"
            });
        }

        // delete menufrom menubank for current restaurant potentially delete in all menu banks in the future
        await MenuBank.findByIdAndUpdate({
            _id: restaurant.menuBank._id
        }, {
            $pull: {
                menus: menuId
            }
        }, {
            new: true
        });

        console.log(`Deleted menu ${menuId} successfully.`);

        res.send({
            status: "success",
            msg: "menu deleted successfully!",
        });
    } catch (err) {
        console.log(
            `An error occurred while deleting menu ${menu.name} into the database`
        );
        res.status(500).send({
            err,
            status: "error"
        });
        return;
    }
};