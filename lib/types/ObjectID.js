'use strict';

var ObjectID = require('mongodb').ObjectID,
    _ = require('lodash')
    ;

/** ObjectID type handler
 * @constructor
 * @implements {IMissyTypeHandler}
 */
var TypeHandler = exports.ObjectID = function(schema, name){
};

TypeHandler.prototype.norm = function(value, field){
    return value;
};

TypeHandler.prototype.load = function(value, field){
    return value;
};

TypeHandler.prototype.save = function(value, field){
    if (_.isNull(value))
        return null;
    if (value instanceof ObjectID)
        return value;
    return new ObjectID(value);
};
