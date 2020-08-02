const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Busboy = require("busboy");
const { authJwt } = require("./middlewares");

/** app configuration start **/

const app = express();

// set the port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

var corsOptions = {
  origin: "https://thecodinggent.github.io",
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json({ limit: "50mb", extended: true }));

// Make sure you place body-parser before your CRUD handlers! This helps tidy up the request object
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const server = require("http").createServer(app);

/** app configuration end **/

/* database management start */

const db = require("./models");
const User = require("./models/User");
const Role = db.role;
const Restaurant = db.restaurant;
const Menu = db.menu;

//connect to the database
db.mongoose
  .connect(process.env.MONGODB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log(
      "Successfully connect to MongoDB at: ",
      process.env.MONGODB_CONNECTION
    );
    initial();
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: "user",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'user' to roles collection");
      });

      new Role({
        name: "admin",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }

        console.log("added 'admin' to roles collection");
      });
    }
  });
}

/** TO CLEAN UP */
/* REST Service Start */

app.get("/", (req, res) => {
  // Note: __dirname is directory current directory you're in. Try logging it and see what you get!
  res.sendFile(__dirname + "/index.html");
});

app.get("/restaurants", (req, res) => {
  console.log("Received request at: " + req.url);

  Restaurant.find().exec(function (err, restaurants) {
    if (err) {
      console.log("Error occurred: " + err);
      res.status(400);
      res.send({ error: err });
    } else if (restaurants === null) {
      res.status(404);
      res.send({ error: "Resource Not Found" });
    } else {
      res.send(restaurants);
      console.log(restaurants);
    }
  });
});

// get restaurant by id
app.get("/restaurants/:id", (req, res) => {
  console.log(
    "Received request at: " + req.url + " with params: " + req.params.id
  );

  if (!db.mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    res.send({ error: "Recieved invalid Id..." });
    return;
  }

  Restaurant.findOne({ _id: req.params.id }).exec(function (err, restaurant) {
    if (err) {
      console.log("Error occurred: " + err);
      res.status(400);
      res.send({ error: err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({ error: "Resource Not Found" });
    } else {
      res.send(restaurant);
      console.log("Retrieved restaurant: " + restaurant);
    }
  });
});

// add a new restaurant
app.post("/restaurants/add", (req, res) => {
  var restaurant = new Restaurant(req.body);

  restaurant.save(function (err, restaurant) {
    if (err) return console.error(err);
    console.log(restaurant.name + " saved to restaurants collection.");
  });
});

// add a new restaurant for a user
app.post("/restaurants/add/user", [authJwt.verifyToken], (req, res) => {
  var userId = req.userId;
  var restaurant = new Restaurant(req.body);

  restaurant.save(function (err, restaurant) {
    if (err) {
      console.error(err);
      res.status(500).send({ message: err });
      return;
    }

    console.log(restaurant.name + " saved to restaurants collection.");

    // add the restaurant Id to the users restaurants
    User.findOneAndUpdate(
      { _id: userId },
      { $push: { restaurants: restaurant._id } },
      { new: true }
    ).exec(function (err, user) {
      if (err) {
        console.log("Error occurred: " + err);
        res.status(400);
        res.send({ error: err });
      } else if (user === null) {
        res.status(404);
        res.send({ error: "Resource Not Found" });
      } else {
        res.send({ success: "Restaurant and user updated successfully!" });
        console.log(
          "Updated restaurant: " + restaurant + " and user: " + user.username
        );
      }
    });
  });
});

// get all menus for a given restaurant
app.get("/restaurants/menus/:id", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);

  Restaurant.findOne({ _id: req.params.id }).exec(function (err, restaurant) {
    if (err) {
      console.log("Error occurred: " + err);
      res.status(400);
      res.send({ error: err });
    } else if (restaurant === null) {
      res.status(404);
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

// Add a menu to an existing restaurant
app.put("/restaurants/menus/add/:id", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);
  console.log("Menu:" + req.body);
  console.log("ID:" + req.params.id);

  Restaurant.findById(req.params.id, "menus maxMenuCount").exec(function (
    err,
    restaurant
  ) {
    if (err) {
      res.status(400);
      res.send({ error: err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({ error: "Resource Not Found" });
    } else {
      console.log(`Checking menus length ${restaurant.menus.length}`);
      if (restaurant.menus.length >= restaurant.maxMenuCount) {
        res.status(403);
        res.send({ error: "Maximum number of allowed menus reached" });
      } else {
        Restaurant.findOneAndUpdate(
          { _id: req.params.id },
          { $push: { menus: req.body } },
          { new: true }
        ).exec(function (err, restaurant) {
          if (err) {
            console.log("Error occurred: " + err);
            res.status(400);
            res.send({ error: err });
          } else if (restaurant === null) {
            res.status(404);
            res.send({ error: "Resource Not Found" });
          } else {
            res.send({ success: "Menu added successfully!" });
            console.log("Updated restaurant: " + restaurant);
          }
        });
      }
    }
  });
});

// Add a menu to an existing restaurant
app.post("/restaurants/menus/update/:id", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);
  console.log("Menu:" + req.body);
  console.log("ID:" + req.params.id);
  Restaurant.findOneAndUpdate(
    { _id: req.params.id, "menus._id": req.body._id },
    { $set: { "menus.$.lastupdated": new Date().toISOString() } }
  ).exec(function (err, restaurant) {
    if (err) {
      console.log("Error occurred: " + err);
      res.status(400);
      res.send({ error: err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({ error: "Resource Not Found" });
    } else {
      res.send({ success: "Menu updated successfully!" });
      console.log("Menu timestamp updated!");
    }
  });
});

// delete a menu from a given restaurant
app.post("/restaurants/menus/delete/:restaurantId", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);
  console.log("Restaurant Id:" + req.params.restaurantId);

  Restaurant.update(
    {},
    { $pull: { menus: { _id: req.body._id } } },
    { multi: true }
  ).exec(function (err, restaurant) {
    if (err) {
      console.log("Error occurred: " + err);
      res.status(400);
      res.send({ error: err });
    } else if (restaurant === null) {
      res.status(404);
      res.send({ error: "Resource Not Found" });
    } else {
      deleteMenuFile(req.params.restaurantId, req.body.filename);
      res.send({ success: "Menu deleted successfully!" });
      console.log("Deleted menu: " + req.body.menuId + " successfully");
    }
  });
});

/************************
 *
 * PDF file handling
 *
 ************************/

// route for retrieving a pdf file of a menu given its name and restaurant id
app.get("/menu/pdf/:id/:filename", (req, res) => {
  console.log("Received request at: " + req.url + " with query: " + req.params);
  const restaurantId = req.params.id; //use restaurant document id for uniqueness
  var filename = req.params.filename + ".pdf";
  const fs = require("fs"); // req.params.name
  var stream = fs.createReadStream(
    __dirname + "/files/" + restaurantId + "/" + filename
  );

  stream.on("error", function () {
    res.status(400);
    res.send({
      error: "An error occurred while trying to load pdf file: " + filename,
    });
    return;
  });

  filename = encodeURIComponent(filename); // Ideally this should strip them
  res.setHeader("Content-disposition", 'inline; filename="' + filename + '"');
  res.setHeader("Content-type", "application/pdf");

  stream.pipe(res);
});

// upload a PDF file to the server
app.post("/menu/pdf/upload/:id", (req, res) => {
  console.log(
    "Received request at: " + req.url + " with restaurant id: " + req.params.id
  );
  const restaurantId = req.params.id; //use restaurant document id for uniqueness

  const fs = require("fs");

  if (fs.existsSync(__dirname + "/files/" + restaurantId)) {
    console.log("Restaurant: " + restaurantId + " dir exists");
  } else {
    console.log(
      "Restaurant: " + restaurantId + " dir DOES NOT exist...creating it"
    );
    fs.mkdirSync(__dirname + "/files/" + restaurantId);
  }

  var busboy = new Busboy({ headers: req.headers });
  busboy.on("file", function (fieldname, file, filename, encoding, mimetype) {
    var saveTo = __dirname + "/files/" + restaurantId + "/" + filename;
    file.pipe(fs.createWriteStream(saveTo));
  });

  busboy.on("finish", function () {
    res.writeHead(200, { Connection: "close" });
    res.end("Files written successfully!");
  });

  return req.pipe(busboy);
});

// Helpers

deleteMenuFile = (restaurantId, filename) => {
  if (restaurantId == null || filename == null) {
    console.log(
      "Failed to delete menu file restaurantId and filename cannot be null"
    );
  }

  const fs = require("fs");

  fs.unlink(
    __dirname + "/files/" + restaurantId + "/" + filename + ".pdf",
    (err) => {
      if (err)
        console.log("Failed to delete " + filename + " for " + restaurantId);
      console.log(
        filename + " for " + restaurantId + " was deleted successfully!"
      );
    }
  );
};

/* REST Service End */

require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);

server.listen(port, () => {
  console.log("Listening on port " + port);
});
