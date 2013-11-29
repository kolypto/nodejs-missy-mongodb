Missy MongoDB driver
====================

MongoDB database driver for [Missy](https://github.com/kolypto/nodejs-missy).

Usage
=====

Creating a Schema
-----------------

Simple form:

```js
var missy = require('missy').loadDriver('mongodb')
    ;

var schema = new missy.Schema('mongodb://localhost/test', {
    connect: {
        // Native MongoClient options
        db: {
            journal: true,
            native_parser: true
        },
        server: {
            ssl: false,
            logger: true
        }
    }
});
```

Full form with manual driver initialization:

```js
var missy = require('missy').loadDriver('mongodb'),
    mongodb = require('mongodb')
    ;

// Driver
var driver = new MongodbDriver(function(){ // Custom connecter function
    // A promise for a client
    return Q.nmcall(mongodb.MongoClient, 'connect',
        'mongodb://localhost/test',
        { db: { journal: true } }
    ); // -> db
});

// Schema
var schema = new missy.Schema(driver);
var schema = new missy.Schema('mongodb://localhost/test'); // short form
```
