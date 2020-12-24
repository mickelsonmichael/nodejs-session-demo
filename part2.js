// For additional notes, see the app.js file from part 1
console.log("Starting FileStore demo...");

const express = require("express");
const session = require("express-session");

const fileStoreLib = require("session-file-store"); // get the filestore library

const app = express();

// Add the middleware
app.use(express.urlencoded());

const FileStore = fileStoreLib(session); // configure the file store to use the session

// We create the session middleware as before
// but this time we give it a `store` parameter
// this store is our new FileStore we just made above
const fileStoreMiddleware = session({
  secret: "demo 2",
  store: new FileStore(),
});

app.use(fileStoreMiddleware); // add the middleware to the pipelien

// That's it.
// The rest of the code below is identical to app.js
// but with all of the comments stripped out

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");

  if (req.session.username) {
    res.write("You are logged in as: " + req.session.username);
    res.write("<br /><a href='/logout'>Logout here</a>");
  } else {
    res.write("You are not logged in");
    res.write("<br /><a href='/login'>Login Here</a>");
  }

  res.end();
});

app.get("/login", (req, res) => {
  if (req.session.username) {
    res.end("You are already logged in!");
  } else {
    res.write("<form method='POST'>");
    res.write(
      "<input name='username' type='text' placeholder='Enter your username' />"
    );
    res.write("<button type='submit'>Login</button>");
    res.end("</form>");
  }
});

app.post("/login", (req, res) => {
  if (req.body.username) {
    req.session.username = req.body.username;
    res.redirect("/");
  } else {
    res.sendStatus(400);
  }

  res.end();
});

app.get("/logout", (req, res) => {
  res.redirect("/");

  if (req.session.username) {
    req.session.destroy(() => res.end());
  } else {
    res.end();
  }
});

app.listen(3000, () => console.log("Application started, listening..."));
