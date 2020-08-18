const db = require("../models");
const Customer = db.customer;

exports.saveCustomer = (req, res) => {
  console.log(
    `Received request to save data for customer ${req.body.fullname} at restaurant ${req.body.restaurant}`
  );

  var restaurantCustomer = new Customer(req.body);

  restaurantCustomer.save(function (err, customer) {
    if (err) {
      console.log(
        `An error occurred while adding restaurant ${restaurantCustomer.fullname}: ${err}`
      );
      res.status(500);
      res.send({ status: "error", err });
    } else {
      res.send({ status: "success", msg: "Customer data saved successfully!" });
      console.log(
        `${customer.fullname} has been saved successfully to the database.`
      );
    }
  });
};
