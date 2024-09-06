// Import and start the bot
require('./bot');

// Your existing code
require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const axios = require("axios");
const cookieParser = require("cookie-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function loginDiscord(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/auth/discord");
  next();
}

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackURL = process.env.CALLBACK_URL;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildID = "1281650466002043093";

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new Strategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      scope: ["identify", "guilds.join"],
    },
    (accessToken, refreshToken, profile, done) => {
      profile.accessToken = accessToken;
      process.nextTick(() => done(null, profile));
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

app.get("/login", (req, res) => res.redirect("/auth/discord"));

app.get(
  "/auth/discord",
  passport.authenticate("discord", { scope: ["identify", "guilds.join"] })
);

app.get(
  "/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      const response = await axios.put(
        `https://discord.com/api/v10/guilds/${guildID}/members/${req.user.id}`,
        {
          access_token: req.user.accessToken,
        },
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("User successfully added to the guild:", response.data);
      res.redirect("/");
    } catch (error) {
      console.error("Error adding user to server:", error.response|| error.message);
      res.redirect("/login");
    }
  }
);

app.use(express.static("public"));

app.get("/", loginDiscord, (req, res) => {
  res.send(`Hello, ${req.user.username}! You are now part of the guild.`);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
