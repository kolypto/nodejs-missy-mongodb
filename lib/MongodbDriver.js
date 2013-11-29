'use strict';

var Q = require('q'),
    events = require('events'),
    util = require('util'),
    mongodb = require('mongodb'),
    _ = require('lodash'),
    missy = require('missy'),
    types = require('./types'),
    u = require('./util')
    ;

/** MongoDB driver for Missy.
 *
 * @param {Function|String} connect
 *      The connecter function, or a string in 'mongodb://127.0.0.1:27017/test' format.
 * @param {Object} options
 *      Driver options
 * @param {Object} options.connect
 *      MongoClient.connect() options (see mongodb docs)
 *
 * @constructor
 * @implements {IMissyDriver}
 * @extends {EventEmitter}
 */
var MongodbDriver = exports.MongodbDriver = function(connect, options){
    // Driver initialization shortcut
    if (!_.isFunction(connect)){
        // Default connecter function
        connect = (function(url){
            return function(){
                return Q.nmcall(mongodb.MongoClient, 'connect',
                    url,
                    _.merge(
                        options.connect || {},
                        { db: {}, server: { auto_reconnect: true } }
                    )
                );
            };
        })(connect);
    }

    // Prepare
    this._connect = connect;
    this.schema = undefined;

    this.client = undefined; // no client
    this.connected = false;
};
util.inherits(MongodbDriver, events.EventEmitter);

MongodbDriver.prototype.toString = function(){
    return 'mongodb';
};

MongodbDriver.prototype.connect = function(){
    var self = this;
    return this._connect()
        .then(function(db){
            self.client = db;
            self.connected = true;
            self.emit('connect');
            return db;
        });
};

MongodbDriver.prototype.disconnect = function(){
    return Q.nmcall(this.client, 'disconnect');
};

MongodbDriver.prototype.bindSchema = function(schema){
    this.schema = schema;

    // Register data types
    this.schema.registerType('ObjectID', types.ObjectID);
};

//region Helpers

/** Get MongoDB collection from a model
 * @param {Model} model
 * @returns {Collection}
 */
MongodbDriver.prototype.getCollection = function(model){
    return this.client.collection(model.options.table);
};

//endregion

//region Queries

MongodbDriver.prototype.findOne = function(model, criteria, fields, sort, options){
    return Q.nmcall(this.getCollection(model), 'findOne',
        u.prepareCriteria(criteria),
        _.extend(options, {
            fields: u.prepareProjection(fields),
            sort:   u.prepareSort(sort)
        })
    ); // -> entity|null
};

MongodbDriver.prototype.find = function(model, criteria, fields, sort, options){
    return Q.nmcall(this.getCollection(model).find(
        u.prepareCriteria(criteria),
        _.extend(options, {
            fields: u.prepareProjection(fields),
            sort:   u.prepareSort(sort),
            skip:  options.skip,
            limit: options.limit
        })
    ), 'toArray'); // -> entities
};

MongodbDriver.prototype.count = function(model, criteria, options){
    return Q.nmcall(this.getCollection(model), 'count',
        u.prepareCriteria(criteria),
        options
    ); // -> int
};

MongodbDriver.prototype.insert = function(model, entities, options){
    return Q.nmcall(this.getCollection(model), 'insert',
        entities,
        options
    ); // -> entities
};

MongodbDriver.prototype.update = function(model, entities, options){
    return u.findAndModifyEntities( this.getCollection(model), entities,
        function(doc){
            if (_.isNull(doc))
                throw new missy.errors.EntityNotFound(model, entity);
            return doc;
        },
        _.extend(options, {
            upsert: false,
            new: true
        })
    ); // -> entities
};

MongodbDriver.prototype.save = function(model, entities, options){
    return u.findAndModifyEntities( this.getCollection(model), entities,
        _.identity,
        _.extend(options, {
            upsert: true,
            new: true
        })
    ); // -> entities
};

MongodbDriver.prototype.remove = function(model, entities, options){
    return u.findAndModifyEntities( this.getCollection(model), entities,
        _.identity,
        _.extend(options, {
            upsert: false,
            remove: true
        })
    ); // -> entities
};

MongodbDriver.prototype.updateQuery = function(model, criteria, update, options){
    var self = this;
    return Q.nmcall(self.getCollection(model), 'update',
            u.prepareCriteria(criteria),
            u.prepareUpdate(update),
            _.extend(options, {
                upsert: options.upsert,
                multi: options.multi
            })
        ).then(function(){
            return self.find(model, criteria);
        }); // -> entities
};

MongodbDriver.prototype.removeQuery = function(model, criteria, options){
    var self = this;

    return self.find(model, criteria)
        .then(function(entities){
            return Q.nmcall(self.getCollection(model), 'remove',
                u.prepareCriteria(criteria),
                _.extend(options, {
                    single: !options.multi
                })
            ).thenResolve(entities);
        }); // -> entities
};

//endregion