require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const flash = require("connect-flash");
const passport = require("passport");
const connectDB = require("./db/connect");
const passportInit = require("./passport/passportInit");
const storeLocals = require("./middleware/storeLocals");

// Initialize Express
const app = express();

// Connect to Database
connectDB(process.env.MONGO_URI);

// Configure Passport
passportInit();
app.use(passport.initialize());
app.use(passport.session());

// Set up session store
const url = process.env.MONGO_URI;
const store = new MongoDBStore({ uri: url, collection: "mySessions" });
store.on("error", (error) => console.log(error));

// Configure session parameters
const sessionParams = {
  secret: process.env.SESSION_SECRET || "defaultSecret",
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};
if (app.get("env") === "production") {
  app.set("trust proxy", 1);
  sessionParams.cookie.secure = true;
}
app.use(session(sessionParams));

// Configure middlewares
app.use(flash());
app.use(storeLocals);
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.use("/sessions", require("./routes/sessionRoutes"));

const secretWordRouter = require("./routes/secretWord");
app.use("/secretWord", require("./middleware/auth"), secretWordRouter);

app.get("/secretWord", (req, res) => {
  if (!req.session.secretWord) req.session.secretWord = "syzygy";
  res.render("secretWord", { secretWord: req.session.secretWord });
});
app.post("/secretWord", (req, res) => {
  if (req.body.secretWord.toUpperCase()[0] === "P") {
    req.flash("error", "That word won't work!");
    req.flash("error", "You can't use words that start with P.");
  } else {
    req.session.secretWord = req.body.secretWord;
    req.flash("info", "The secret word was changed.");
  }
  res.redirect("/secretWord");
});

// 404 and error handling
app.use((req, res) => res.status(404).send(`That page (${req.url}) was not found.`));
app.use((err, req, res, next) => {
  res.status(500).send(err.message);
  console.error(err);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));
