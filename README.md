Missy MongoDB driver
====================

MongoDB database driver for Missy

Usage
=====

```js
var missy = require('missy'),
    require('missy-mongodb')
    ;

// Driver
var mongoDriver = new MongodbDriver(function(){
    // Connecter function
}, {
    // driver options
    journal: true
});

// Schema
var schema = new missy.Schema(mongoDriver);
```
