const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nanoid = require("nanoid");

const Restaurant = require("./models/Restaurant");

// constants
const app = express();
const port = 3000;

/** app configuration start **/
app.use(bodyParser.json());

// to be updated to only allow connections from a specific origin
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Make sure you place body-parser before your CRUD handlers! This helps tidy up the request object
app.use(express.urlencoded({ extended: true }));

app.listen(port, function () {
  console.log("listening on 3000");
});

/** app configuration end **/

/* database management start */

// database connection string
const connectionString =
  "mongodb+srv://dbBienmenu:vocse0-ranniD-bempoz@cluster0-pfwuh.gcp.mongodb.net/bienmenu-db?retryWrites=true&w=majority";

// connect to the database
mongoose.connect(connectionString, {
  useNewUrlParser: true,
});

// verify connection to the database
const db = mongoose.connection;
db.once("open", (_) => {
  console.log("Database connected:", connectionString);
});

db.on("error", (err) => {
  console.error("connection error:", err);
});

//Restaurant.deleteMany({});

function saveRestaurant(restaurant) {
  const r = new Restaurant(restaurant);
  return r.save();
}

// saveRestaurant({
//   name: "Piatti Pronti",
//   city: "Laval",
//   address: "1794, boul. Le Corbusier, H7S 2K1",
//   menus: [
//     { name: "Menu", url: "" },
//     { name: "Wine List", url: "" },
//     { name: "Dinner&Show Menu", url: "" },
//   ],
//   rating: 4.5,
//   color: "red",
// })
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((error) => {
//     console.error(error);
//   });

/* REST Service Start */

app.get("/", (req, res) => {
  // Note: __dirname is directory current directory you're in. Try logging it and see what you get!
  res.sendFile(__dirname + "/index.html");
});

// get all menus for a given restaurant
app.get("/restaurants/menus/:id", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);

  Restaurant.findOne({ _id: req.params.id }).exec(function (err, restaurant) {
    if (err) {
      next(err); // pass the error to Express
    } else if (restaurant === null) {
      res.status(400);
      res.send({ error: "Resource Not Found" });
    } else {
      res.send(restaurant.menus);
      console.log(
        "Retrieve menus: " +
          restaurant.menus +
          " for restaurant: " +
          req.params.restaurantId
      );
    }
  });
});

// get restaurant by id
app.get("/restaurants/:id", (req, res) => {
  console.log(
    "Received request at: " + req.url + " with params: " + req.params.id
  );
  Restaurant.findOne({ _id: req.params.id }).exec(function (err, restaurant) {
    if (err) {
      next(err); // pass the error to Express
    } else if (restaurant === null) {
      res.status(400);
      res.send({ error: "Resource Not Found" });
    } else {
      res.send(restaurant);
      console.log("Retrieved restaurant: " + restaurant);
    }
  });
});

// route for retrieving a pdf file of a menu given its name and restaurant id
app.get("/menu/pdf/:id/:name", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);
  const restaurantId = req.params.id; //use restaurant document id for uniqueness
  const menuName = req.params.name;
  var fs = require("fs"); // req.params.name
  var filename = menuName + ".pdf"; // Be careful of special characters
  var stream = fs.createReadStream("./public/" + restaurantId + "/" + filename);
  filename = encodeURIComponent(filename); // Ideally this should strip them

  res.setHeader("Content-disposition", 'inline; filename="' + filename + '"');
  res.setHeader("Content-type", "application/pdf");

  stream.pipe(res);
});

/* REST Service End */
