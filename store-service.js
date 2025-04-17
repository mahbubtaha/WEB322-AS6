const Sequelize = require('sequelize');
var sequelize = new Sequelize('neondb', 'neondb_owner', 'npg_ncl3oXEhW4is', {
  host: 'ep-misty-field-a5oa5wc5-pooler.us-east-2.aws.neon.tech',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  },
  query: { raw: true }
});

// Define the Item model
const Item = sequelize.define('Item', {
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  postDate: Sequelize.DATE,
  featureImage: Sequelize.STRING,
  published: Sequelize.BOOLEAN,
  price: Sequelize.DOUBLE
});

// Define the Category model
const Category = sequelize.define('Category', {
  category: Sequelize.STRING
});

// Define the relationship between Item and Category
Item.belongsTo(Category, {foreignKey: 'category'});

module.exports.initialize = function() {
  return new Promise((resolve, reject) => {
    sequelize.sync()
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject("unable to sync the database");
      });
  });
};

module.exports.getAllItems = function() {
  return new Promise((resolve, reject) => {
    Item.findAll()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject("no results returned");
      });
  });
};

module.exports.getItemsByCategory = function(category) {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        category: category
      }
    })
    .then((data) => {
      resolve(data);
    })
    .catch((err) => {
      reject("no results returned");
    });
  });
};

module.exports.getItemsByMinDate = function(minDateStr) {
  return new Promise((resolve, reject) => {
    const { gte } = Sequelize.Op;
    
    Item.findAll({
      where: {
        postDate: {
          [gte]: new Date(minDateStr)
        }
      }
    })
    .then((data) => {
      resolve(data);
    })
    .catch((err) => {
      reject("no results returned");
    });
  });
};

module.exports.getItemById = function(id) {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        id: id
      }
    })
    .then((data) => {
      if (data.length > 0) {
        resolve(data[0]);
      } else {
        reject("no results returned");
      }
    })
    .catch((err) => {
      reject("no results returned");
    });
  });
};

module.exports.addItem = function(itemData) {
  return new Promise((resolve, reject) => {
    // Ensure published is set properly
    itemData.published = (itemData.published) ? true : false;
    
    // Replace empty values with null
    for (let prop in itemData) {
      if (itemData[prop] === "") {
        itemData[prop] = null;
      }
    }
    
    // Set postDate to the current date
    itemData.postDate = new Date();
    
    // Create the Item in the database
    Item.create(itemData)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject("unable to create item");
      });
  });
};

module.exports.getPublishedItems = function() {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        published: true
      }
    })
    .then((data) => {
      resolve(data);
    })
    .catch((err) => {
      reject("no results returned");
    });
  });
};

module.exports.getPublishedItemsByCategory = function(category) {
  return new Promise((resolve, reject) => {
    Item.findAll({
      where: {
        published: true,
        category: category
      }
    })
    .then((data) => {
      resolve(data);
    })
    .catch((err) => {
      reject("no results returned");
    });
  });
};

module.exports.getCategories = function() {
  return new Promise((resolve, reject) => {
    Category.findAll()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject("no results returned");
      });
  });
};

module.exports.addCategory = function(categoryData) {
  return new Promise((resolve, reject) => {
    // Replace empty values with null
    for (let prop in categoryData) {
      if (categoryData[prop] === "") {
        categoryData[prop] = null;
      }
    }
    
    // Create the Category in the database
    Category.create(categoryData)
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject("unable to create category");
      });
  });
};

module.exports.deleteCategoryById = function(id) {
  return new Promise((resolve, reject) => {
    Category.destroy({
      where: {
        id: id
      }
    })
    .then((rowsDeleted) => {
      if (rowsDeleted > 0) {
        resolve();
      } else {
        reject("Category not found");
      }
    })
    .catch((err) => {
      reject("unable to delete category");
    });
  });
};

module.exports.deletePostById = function(id) {
  return new Promise((resolve, reject) => {
    Item.destroy({
      where: {
        id: id
      }
    })
    .then((rowsDeleted) => {
      if (rowsDeleted > 0) {
        resolve();
      } else {
        reject("Item not found");
      }
    })
    .catch((err) => {
      reject("unable to delete item");
    });
  });
};
