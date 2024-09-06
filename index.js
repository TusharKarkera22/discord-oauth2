const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const axios = require("axios");
const cookieParser = require("cookie-parser");

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

function loginDiscord(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/auth/discord");
  next();
}

// Move sensitive information to environment variables for security
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackURL = process.env.CALLBACK_URL;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(
  new Strategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope: ["identify", "guilds.join"],
    },
    function (accessToken, refreshToken, profile, done) {
      // Save the access token to the user object
      profile.accessToken = accessToken;
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  )
);

app.use(cookieParser());

app.use(
  session({
    secret: "y",
    saveUninitialized: true,
    resave: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/login", (req, res) => {
  res.redirect("/auth/discord");
});

app.get(
  "/auth/discord",
  passport.authenticate("discord", {
    scope: ["identify", "guilds.join"], // Add "guilds.join" to the scope
  })
);

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      // Add user to the server (guild)
      await axios.put(
        `https://discord.com/api/v10/guilds/1281650466002043093/members/${req.user.id}`,
        {
          access_token: req.user.accessToken, // The access token obtained from Discord
        },
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, // Use your bot token from environment variable
            "Content-Type": "application/json",
          },
        }
      );

      // Redirect user after successful join
      res.redirect("/");
    } catch (error) {
      console.error("Error adding user to server:", error.response?.data || error.message);
      res.redirect("/login"); // Redirect to login on failure
    }
  }
);

// Serve static files from the 'public' folder
app.use(express.static("public"));

app.get("/", loginDiscord, (req, res) => {
  res.send(req.user);
});

// Listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
