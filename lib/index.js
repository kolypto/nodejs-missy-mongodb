'use strict';

var missy = require('missy')
    ;

exports.MongodbDriver = require('./MongodbDriver').MongodbDriver;
exports.types = require('./types');

missy.registerDriver('mongodb', exports.MongodbDriver);
