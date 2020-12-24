const express = require("express"); // express will handle the server running
const session = require("express-session"); // express-session exposes the session ability

const app = express(); // Create a new "app" with express

// create the middleware allowing us to read <form> data
const urlencodedMiddleware = express.urlencoded();
app.use(urlencodedMiddleware);

// create the session middleware
// this normally is done within the app.Use() call
// by default, the session middleware stores the session using a "MemoryStore"
// this is NOT ideal, and in a production environment you would switch it out with something more robust
// but, for now, we are happy to use the default because this will never be a production application
const sessionMiddleware = session({
  secret: "this is a demo", // the secret value used to sign the session ID
});

// Add the middleware to our application
app.use(sessionMiddleware);

// Configure our home page
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html"); // make sure the html is parsed properly

  // if we are already logged in on the browser
  if (req.session.username) {
    res.write("You are logged in as: " + req.session.username);
    res.write("<br /><a href='/logout'>Logout here</a>");
  } else {
    res.write("You are not logged in");
    res.write("<br /><a href='/login'>Login Here</a>");
  }

  res.end(); // you must always call an "end" to your responses (at least without a router)
});

// Our login page should show a form allowing the "user" to log in
app.get("/login", (req, res) => {
  // if they're already logged in, let them know about it
  if (req.session.username) {
    res.end("You are already logged in!");
  } else {
    res.write("<form method='POST'>");
    // when submitted, this field will be bound to the `req.body.username` property because I gave it the `name="username"` attr
    // however, this requires the urlencoded middleware I added above
    res.write(
      "<input name='username' type='text' placeholder='Enter your username' />"
    );
    res.write("<button type='submit'>Login</button>");
    res.end("</form>");
  }
});

// Hanlde the login form submission
app.post("/login", (req, res) => {
  // if they entered something in to the username text box
  // this is `req.body`, which is the body of the request, and is distinct from `req.session`
  if (req.body.username) {
    req.session.username = req.body.username; // Assign a value to our session
    res.redirect("/"); // Send them home
  } else {
    res.sendStatus(403); // Send a forbidden response because they didn't enter anything in the text box
  }

  res.end();
});

// Handle the logout form submission
app.get("/logout", (req, res) => {
  res.redirect("/"); // automatically redirect after done

  if (req.session.username) {
    // if they are currently logged in
    req.session.destroy(() => res.end()); // tell the session to destroy itself, then call end() once that's fully complete
  } else {
    res.end(); // otherwise we aren't logged in, so just end right away
  }
});

// Start the server listening on port 3000
app.listen(3000, () => console.log("Application started, listening..."));
