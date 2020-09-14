const express = require("express");
const cors = require("cors");
const db = require("./models");

const app = express();

require("dotenv").config();

// set the port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

var corsOptions = {
  origin: process.env.CORS_OPTION,
};

app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json({ limit: "50mb", extended: true }));

app.use(express.urlencoded({ limit: "50mb", extended: true }));

const server = require("http").createServer(app);

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
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);
require("./routes/restaurant.routes")(app);
require("./routes/file.routes")(app);
require("./routes/customer.routes")(app);
require("./routes/payment.routes")(app);

server.listen(port, () => {
  console.log("Listening on port " + port);
});
