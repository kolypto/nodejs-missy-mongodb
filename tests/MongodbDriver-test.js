'use strict';

var Q = require('q'),
    _ = require('lodash'),
    missy = require('missy')
    ;
require('../');

/** Set up the Schema
 */
exports.setUp = function(callback){
    if (!process.env['MISSY_MONGODB'])
        throw new Error('Environment variable is not set: MISSY_MONGODB');

    this.schema = new missy.Schema([
        process.env['MISSY_MONGODB'],
        { connect: {
            db: {
                journal: false,
                native_parser: false
            },
            server: {
                ssl: false,
                logger: false,
                auto_reconnect: false
            },
            replSet: null,
            mongos: null
        } }
    ]);

    this.schema.connect()
        .nodeify(callback);
};

exports.testMongodbDriver = function(test){
    console.log('TEST');
    test.done();
};

exports.tearDown = function(callback){
    if (!this.schema)
        return callback();

    var schema = this.schema,
        db = schema.getClient();

    // Collect models' collections
    var collections = _.map(schema.models, function(model){
        return model.options.table;
    });

    Q()
        // Load existing collection names
        .then(function(){
            return Q.nmcall(db, 'collectionNames')
                .then(function(collections){
                    return _.pluck(collections, 'name');
                });
        })
        // Remove collections
        .then(function(existingCollections){
            console.log('Existing collections: ', existingCollections);
            console.log('Drop: ', collections);

            return _.map(
                    _.intersection(collections, existingCollections),
                    function(collection){
                        return function(){
                            return Q.nmcall(db.collection(collection, 'drop'));
                        };
                    }
            ).reduce(Q.when, Q(1));
        })
        .then(function(){
            return schema.disconnect();
        })
        // Finish
        .nodeify(callback);
};
