const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String,
  email: String,
  loginHistory: [
    {
      dateTime: Date,
      userAgent: String
    }
  ]
});

let User; // to be defined on new connection (see initialize)

module.exports.initialize = function() {
  return new Promise(function(resolve, reject) {
    let db = mongoose.createConnection("mongodb+srv://mstaha:taha9090@web322.cgryeov.mongodb.net/");

    db.on('error', (err) => {
      reject(err); // reject the promise with the provided error
    });

    db.once('open', () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function(userData) {
  return new Promise(function(resolve, reject) {
    // Check if passwords match
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
      return;
    }

    // Hash the password using bcrypt
    bcrypt.hash(userData.password, 10)
      .then(hash => {
        // Set the hashed password
        userData.password = hash;

        // Create a new user
        let newUser = new User(userData);
        
        // Save the user to the database
        newUser.save()
          .then(() => {
            resolve();
          })
          .catch(err => {
            if (err.code === 11000) {
              reject("User Name already taken");
            } else {
              reject(`There was an error creating the user: ${err}`);
            }
          });
      })
      .catch(err => {
        reject("There was an error encrypting the password");
      });
  });
};

module.exports.checkUser = function(userData) {
  return new Promise(function(resolve, reject) {
    User.find({ userName: userData.userName })
      .exec()
      .then(users => {
        if (users.length === 0) {
          reject(`Unable to find user: ${userData.userName}`);
          return;
        }

        // Compare hashed password
        bcrypt.compare(userData.password, users[0].password)
          .then(result => {
            if (!result) {
              reject(`Incorrect Password for user: ${userData.userName}`);
              return;
            }
            
            // Update login history
            users[0].loginHistory.push({
              dateTime: new Date().toString(),
              userAgent: userData.userAgent
            });

            // Update the user in the database
            User.updateOne(
              { userName: users[0].userName },
              { $set: { loginHistory: users[0].loginHistory } }
            )
              .exec()
              .then(() => {
                resolve(users[0]);
              })
              .catch(err => {
                reject(`There was an error verifying the user: ${err}`);
              });
          })
          .catch(err => {
            reject(`There was an error verifying the user: ${err}`);
          });
      })
      .catch(err => {
        reject(`Unable to find user: ${userData.userName}`);
      });
  });
};