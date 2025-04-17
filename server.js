/*********************************************************************************
WEB322 – Assignment 06
I declare that this assignment is my own work in accordance with Seneca Academic Policy. 
No part of this assignment has been copied manually or electronically from any other source 
(including 3rd party web sites) or distributed to other students. I acknowledge that violation
of this policy to any degree results in a ZERO for this assignment and possible failure of 
the course.

Name:                   Mahbub Taha
Student ID:             108106238
Date:                   March 21th, 2025
Vercel Web App URL:     
GitHub Repository URL:  
********************************************************************************/
const path = require("path");
const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");
const storeService = require("./store-service.js");
const authData = require("./auth-service.js");
const clientSessions = require("client-sessions");
require("dotenv").config();

cloudinary.config({
  cloud_name: 'dmbzenkoc',
  api_key: '573716817138661',
  api_secret: 'u4bn6xXu7xLJs3gOGUCDjJZZxq8',
  secure: true
});

const upload = multer();

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Add urlencoded middleware for form processing
app.use(express.urlencoded({extended: true}));

// Setup client-sessions
app.use(clientSessions({
  cookieName: "session",
  secret: "web322_assignment6_secret",
  duration: 30 * 60 * 1000, // 30 minutes
  activeDuration: 10 * 60 * 1000 // 10 minutes
}));

// Make session data available to templates
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// Helper middleware function to check if user is logged in
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

const hbs = exphbs.create({
  extname: ".hbs",
  helpers: {
    navLink: function (url, options) {
      const activeClass =
        url == app.locals.activeRoute
          ? "nav-menu-item active"
          : "nav-menu-item";
      return `<li class="${activeClass}">
                <a class="nav-menu-item-link" href="${url}">${options.fn(
        this
      )}</a>
              </li>`;
    },
    equal: function (lvalue, rvalue, options) {
      if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
      if (lvalue != rvalue) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    },
    safeHTML: function (html) {
      return new Handlebars.SafeString(html);
    },
    formatDate: function(dateObj) {
      let year = dateObj.getFullYear();
      let month = (dateObj.getMonth() + 1).toString();
      let day = dateObj.getDate().toString();
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
    }
  },
});

app.use(express.static(path.join(__dirname, "public")));

app.engine(".hbs", hbs.engine);
app.set("view engine", ".hbs");

app.use(function (req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

// Routes //////////////////////////////////////////////////////////////
// Home route
app.get("/", (req, res) => {
  res.redirect("/shop");
});

// About route
app.get("/about", (req, res) => {
  res.render("about");
});

// Shop route
app.get("/shop/:id", async (req, res) => {
  let viewData = {};

  try {
    let items = [];

    if (req.query.category) {
      items = await storeService.getPublishedItemsByCategory(
        req.query.category
      );
    } else {
      items = await storeService.getPublishedItems();
    }

    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    viewData.items = items;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    viewData.item = await storeService.getItemById(req.params.id);
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    let categories = await storeService.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }
  res.render("shop", { data: viewData });
});

app.get("/shop", async (req, res) => {
  let viewData = {};

  try {
    let items = [];

    if (req.query.category) {
      items = await storeService.getPublishedItemsByCategory(
        req.query.category
      );
    } else {
      items = await storeService.getPublishedItems();
    }

    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    let item = items[0];

    viewData.items = items;
    viewData.item = item;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    let categories = await storeService.getCategories();

    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  res.render("shop", { data: viewData });
});

// Items routes - protected by ensureLogin
app.get("/items", ensureLogin, (req, res) => {
  const { category, minDate } = req.query;

  if (category) {
    storeService
      .getItemsByCategory(category)
      .then((data) => {
        if (data.length > 0) {
          res.render("items", { items: data });
        } else {
          res.render("items", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("items", { message: "no results" });
      });
  } else if (minDate) {
    storeService
      .getItemsByMinDate(minDate)
      .then((data) => {
        if (data.length > 0) {
          res.render("items", { items: data });
        } else {
          res.render("items", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("items", { message: "no results" });
      });
  } else {
    storeService
      .getAllItems()
      .then((data) => {
        if (data.length > 0) {
          res.render("items", { items: data });
        } else {
          res.render("items", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("items", { message: "no results" });
      });
  }
});

app.get("/items/add", ensureLogin, (req, res) => {
  storeService.getCategories()
    .then((data) => {
      res.render("addItem", {categories: data});
    })
    .catch(() => {
      res.render("addItem", {categories: []});
    });
});

app.post("/items/add", ensureLogin, upload.single("featureImage"), (req, res) => {
  const processItem = (imageUrl) => {
    req.body.featureImage = imageUrl;

    storeService
      .addItem(req.body)
      .then(() => res.redirect("/items"))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Unable to add item." });
      });
  };

  if (req.file) {
    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) resolve(result);
          else reject(error);
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    streamUpload(req)
      .then((uploaded) => processItem(uploaded.url))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Unable to upload image." });
      });
  } else {
    processItem("");
  }
});

app.get("/items/:id", ensureLogin, (req, res) => {
  storeService
    .getItemById(req.params.id)
    .then((item) => res.json(item))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Unable to fetch item by ID." });
    });
});

// New route to delete an item - protected by ensureLogin
app.get("/items/delete/:id", ensureLogin, (req, res) => {
  storeService.deletePostById(req.params.id)
    .then(() => {
      res.redirect("/items");
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Item / Item not found");
    });
});

// Categories routes - protected by ensureLogin
app.get("/categories", ensureLogin, (req, res) => {
  storeService
    .getCategories()
    .then((data) => {
      if (data.length > 0) {
        res.render("categories", { categories: data });
      } else {
        res.render("categories", { message: "no results" });
      }
    })
    .catch((err) => {
      res.render("categories", { message: "no results" });
    });
});

// New routes for adding categories - protected by ensureLogin
app.get("/categories/add", ensureLogin, (req, res) => {
  res.render("addCategory");
});

app.post("/categories/add", ensureLogin, (req, res) => {
  storeService.addCategory(req.body)
    .then(() => {
      res.redirect("/categories");
    })
    .catch((err) => {
      res.status(500).send("Unable to Create Category");
    });
});

// New route to delete a category - protected by ensureLogin
app.get("/categories/delete/:id", ensureLogin, (req, res) => {
  storeService.deleteCategoryById(req.params.id)
    .then(() => {
      res.redirect("/categories");
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Category / Category not found");
    });
});

// Login Routes
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  
  authData.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      }
      res.redirect('/items');
    })
    .catch((err) => {
      res.render("login", {
        errorMessage: err,
        userName: req.body.userName
      });
    });
});

// Register Routes
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  authData.registerUser(req.body)
    .then(() => {
      res.render("register", {
        successMessage: "User created"
      });
    })
    .catch((err) => {
      res.render("register", {
        errorMessage: err,
        userName: req.body.userName
      });
    });
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

// User History Route
app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory");
});

// 404 route
app.use((req, res) => {
  res.status(404).render("404_page");
});

// Initialize the store service and start the server
storeService
  .initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () =>
      console.log(`Server running at http://localhost:${HTTP_PORT}`)
    );
  })
  .catch((err) => {
    console.error("Unable to start server:", err);
  });