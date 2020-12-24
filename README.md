# NodeJS Sessions Demo

To start off, install the required packages using

```bash
npm install
```

If you are curious which packages have been added to the project, check out the `packages.json` file, or you can run the `npm list --depth=0` command. Once they are installed, you can run the `start` or `part1` command to begin running the first version of our web server, then navigate to `localhost:3000` to view it in your browser.

```bash
npm run start
```

When you're done, stop the application in your shell by pressing `Ctrl+C`.

The following sections describe sessions in detail. **A demonstration of the topics can be found in the `part1.js` file.**

## What is a Session

A session is a browser-specific set of information **stored on the server**. When a session is generated for the browser, the server creates a unique session ID, which is sent back to the user in the headers and then stored in a broswer cookie. This means that if you switch browsers or clear the cookies, you will "log out" of the session.

Once a session is generated, the browser will then send the session ID in as part of the request headers. The session middleware will then grab the ID from the headers and retrieve the session data from a back-end store. The store can be an in-memory store, but that it generally bad for production scenarios, where it is better to store it in a cache (like Redis) or database (like MongoDB).

It's worth noting that the exact implementation of how sessions are stored and communicated to the server may change depending on the implemenation. But in our case, it will be using headers and cookies.

## Creating an Express Session

To start off, import the session library by using `const session = require("express-session");`. This will give you an entrypoint into the library's many features. If you are starting a new project instead of using the demo provided in the `part1.js` file, you will need to install both express and express-session via npm.

```
npm install express express-session
```

Next, you will need to generate a session middleware component.

```js
const sessionMiddleware = session({
  secret: "some secret value",
});
```

This step is generally combined with the `app.Use` method as specified later, but I think it's worth seeing it on its own beforehand. The object passed in to the `session()` call is a "sessionOptions" object; it lets the session library know how to generate the middleware. The only required field is a `secret`, which is a value you need to provide.

> This is the secret used to sign the session ID cookie. This can be either a string for a single secret, or an array of multiple secrets. If an array of secrets is provided, only the first element will be used to sign the session ID cookie, while all the elements will be considered when verifying the signature in requests. The secret itself should be not easily parsed by a human and would best be a random set of characters.

You can read more about the `secret` in the expressjs documentation for sessions here: https://github.com/expressjs/session#secret

The return value from the `session` method is a function. If you're using a modern IDE, you can see that if you attempt to call the method, you will be shown a list of parameters that you can pass in

![image](https://i.imgur.com/g8wqlId.png)

> Note: The name `session` is arbitary. We determined it when we imported the package with the `const session = require()` call; we could have called it anything we like, it's up to us. But session is how it is named in all the documentation, so we stick with it for consistency

You don't really need to concern yourself with the parameters at a high level, just know that it is a function that will be called by express when the time comes.

### What is Middleware

This section is optional; you don't need it to run the code, but you do need it to **understand** the code at a deeper level.

When a request comes in to Express, it is routed through what is generally known as a "middleware pipeline". This concept is not unique to express, and is a common way to handle requests. Essentially, when the request comes in, express routes it through a series of serverices, called "middleware". Each middleware takes in the request and response, and can do whatever it likes with it before passing it on to the next middleware in the chain. Or, if it so chooses, stop the chain early and skip the remaining middleware.

Once all the configured middleware has been passed, the request is sent finally to our code, which could be thought of as the final middleware layer before the response is sent back (although it may be the case that more middleware modifies the response message on the way out).

## Adding the Session Middleware

We now can add the method returned from the `session` library as a middleware in our express pipeline.

```js
const app = express();

app.use(sessionMiddleware);
```

These two steps are often combined into one, since there isn't much use to keeping the reference to `sessionMiddleware` around; you aren't going to use it anywhere else, so not much of a point in naming it something.

```js
app.use(
  session({
    secret: "key",
  })
);
```

Now, when a request comes in, the middleware will perform the following process

1. Read the session ID from the request headers
2. Go to the configured session store, and retrieve the session with that ID
3. If the session is found, attach it to the request so we can use it later down the pipeline

Once the pipeline reaches our code, the request will then have the newly attached `req.session` property, which contains all the session information we have defined.

If no session is found, a new one is created for the user, and the session ID is stored as a cookie on the browser. You can see this in action in the Network section of your browser's dev tools.

![The cookie in the response](https://i.imgur.com/r4U3S99.png)

Next request we make, the browser will automatically add the session ID in as part of the header, which the sesion middleware will then read and use to retrieve the user's session from the store.

![The cookie in the request](https://i.imgur.com/qaNxf7v.png)

This again means that if you clear cookies or switch browsers, you will create a completely different session, and the original session will be lost. The session creation is done all for us by the middleware; we don't have to worry about it ourselves, we just get to use the fruits of the middleware's labor!

## Updating the Session

With our session now in our request, we can update it, and the session middleware will automatically save the changed values to the configured store. By default, with express session, this is an in-memory store, but it could be configured to be any sort of long-term storage.

For example, consider the login method below

```js
app.get("/", (req, res) => {
  if (req.session.username) {
    res.end("You are already logged in!");
  } else {
    res.end("You are NOT logged in!");
  }
});
```

We're checking for our user to be "logged in" by checking the `req.session.username` field. We _aren't_ checking if `req.session` exists because it will automatically exist when it is created when the user first loads the web page. It should normally never be undefined, unless the user manipulates their request manually or sends it via something other than a browser.

We can "log" the user in using the code below

```js
app.post("/login", (req, res) => {
  req.session.username = req.body.username;
  res.redirect("/");
  res.end();
});
```

When we modify `req.session.username` it is updated by the session store, and the value will be available as part of the next request.

## Destorying the Session

When we're done with our session and we want to "log out" the browser, we can simply use the `destroy` method on the session (or alternatively can just clear our `req.session.username`, since there may be other things we're tracking as part of our session).

```js
app.get("/logout", (req, res) => {
  res.redirect("/");

  req.session.destroy(() => res.end());
});
```

The destory method takes in a callback method. A callback method is a method that is called once the `destroy` method has fully completed. The signature for `destory` could be distilled to something like this then

```js
function destroy(callbackFunction) {
  // does some stuff

  callbackFunction();
}
```

Callbacks are a common paradigm in JavaScript due to the fact that functions can be easily stored in variables and passed around. This feature isn't as prevalent in some languages, thus isn't quite as popular a methodology.

So we leverage the callback to only end the response once the session has been successfully destroyed. This may not be desired functionality at times, you may be more interested in returning early from the request.

## Part 2: The Less Temporary Store

There's a problem with our code from part 1, and it's one I've mentioned a few times now. The sessions are in-memory.

That means that when you close the app, you delete the sessions. Try it out, launch the app and log in, then stop the application. Launch again and voila, you are logged out. That's the downside of an in-memory store and one of the reasons why in-memory is not a good idea for production servers; if your server were to go down, even for a millisecond, you would lose all your users' session information.

> Note: In-memory also isn't scalable. If one server is storing the login information in one database, then the user is married to that server; the other server(s) have no idea about that user's session, and therefore if that server goes down, the scaling meant very little to the user and your apps redundancy is very low

So let's fix that, let's replace the session store with a very basic file store. File stores are again, not the best idea in a production environment, but they have more longevity than an in-memory store since they will survive as long as the disc isn't cleaned out.

### Installing the new package

Let's utilize the [session-file-store](https://www.npmjs.com/package/session-file-store) package, which is designed to work closely with the express-session middleware. We don't make many changes, essentially just a two line change.

First, import the library like you would any other libarary.

```js
const fileStoreLib = require("session-file-store");
```

Next, lets tell it about our session library, so it can utilize it to manage the session.

```js
const FileStore = fileStoreLib(session);
```

This provides us with a class that we can instantiate to work as our store. Finally, when we're registering the the middleware, we pass it our new store

```js
const sessionMiddleware = session({
  secret: "another secret",
  store: new FileStore(),
});
```

> Note: The FileStore constructor takes in an option object. [Check out the documentation if you want to customize your store](https://www.npmjs.com/package/session-file-store) a little bit

And that's it, we pass the middleware in as we did before and the rest of the code is the same as before. "But Mike" I hear you say, "that's a three line change!" Well they can be condensed a bit more, I'm just being unecessarily verbose.

```js
const FileStore = require("session-file-store")(session);

app.use(
  session({
    secret: "another secret",
    store: new FileStore(),
  })
);
```

### Running our new store

Run the application using the part2 command

```npm
npm run part2
```

And you'll notice... well nothing. Nothing has changed from the user's perspective. That's one powerful thing about the session pipeline, it does not require any changes on the "front-end" part of the application; all the sign in code can continue to work the same, all you have to do is change the middleware, which allows you to swap out session storage methods however you'd like. We could decide we don't like our MongoDB store because it takes too long, so we can swap it out with Redis without changing anything but a line or two (this will disconnect the user's session, but a small price to pay).

What's really the important difference here is the lifetime of the session. Try stopping the application and restarting. You're still logged in. This is beacuse the storage is now stored in a file instead of the application's memory.

### Where is our store stored

So what does it mean to have a file store now? Well let's check out the file system

![ls](https://i.imgur.com/2Zku6w8.png)

Notice that there's a new directory `session` that wasn't there before.

> Note: I have added this directory to the .gitignore file so that it isn't included in Git source control. We don't want to upload this information to our repository

If we list the contents of the directory, we see a new JSON file

![ls sessions](https://i.imgur.com/kcdoNe6.png)

The actual name of the file will be different from mine. Or anybody else's. The filename is the session ID of the session, so it is unique and random. Finally, let's open it up and see what's inside

![python -m json.tool sessions/{filename}.json](https://i.imgur.com/IxoTTms.png)

> Note: I'm using a python tool to print the JSON in a little more readable format

The contents of the file are what we transform into our `req.body` property (or should I say the middleware does it for us). Feel free to explore the JSON, but take special note that we have our `username` property right there. This is where our middleware is storing the session information instead of in-memory. This will be a more stable storage solution (admittedly slower solution, but most solutions are a balance between speed and reliability and cost) which will survive most server hiccups that may occur without logging the user out before they're ready.

## Summary

We can replace the middleware with any kind of storage solution we'd like. There's a big long list in the express-session documentation so you can pick whichever you'd like. You could also wrap your own if you're feeling adventurous, but just be ready for some work; it's not the simplest thing to do if you aren't comfortable with the pipeline.

Sessions are used to store user-specific data, and can be used to tarck any information about the user you'd like, most notably the user login information. Therefore, it's a very important thing to get right.
