'use strict';

var Q = require('q'),
    _ = require('lodash'),
    missy = require('missy'),
    ObjectID = require('mongodb').ObjectID
    ;
require('../');

/** Set up the Schema
 */
exports.setUp = function(callback){
    if (!process.env['MISSY_MONGODB'])
        throw new Error('Environment variable is not set: MISSY_MONGODB');

    var schema = this.schema = new missy.Schema([
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

    schema.connect()
        .nodeify(callback);
};

/** Test driver: specific cases
 * @param {test|assert} test
 */
exports.testMongodbDriver = function(test){
    var schema = this.schema;

    var Post = schema.define('Post', {
        _id: 'ObjectID',
        title: String,
        length: Number,
        date: Date,
        tags: Array,
        data: Object
    }, { pk: '_id', table: '__test_posts' });

    var now = new Date();

    return [
        // Insert
        function(){
            return Post.insert({
                title: 'first',
                length: '5',
                date: now,
                tags: ['a','b','c'],
                data: {a:1,b:2},
                extra: 111
            })
            .then(function(entity){
                test.ok(entity._id instanceof ObjectID); // assigned
                test.deepEqual(_.omit(entity, '_id'), {
                    title: 'first',
                    length: 5, // converted
                    date: now, // same
                    tags: ['a','b','c'],
                    data: {a:1,b:2},
                    extra: 111
                });
            });
        },
        // Save
        function(){
            return Post.save({
                title: 'second',
                length: '6',
                date: now,
                tags: ['a','b','c'],
                data: {a:1,b:2},
                extra: 111
            })
            .then(function(entity){
                test.ok(entity._id instanceof ObjectID); // assigned
                test.deepEqual(_.omit(entity, '_id'), {
                    title: 'second',
                    length: 6, // converted
                    date: now, // same
                    tags: ['a','b','c'],
                    data: {a:1,b:2},
                    extra: 111
                });
            });
        },
        // Find
        function(){
            return Post.find()
                .then(function(entities){
                    test.equal(entities.length, 2);
                    test.equal(entities[0].title, 'first');
                    test.equal(entities[1].title, 'second');
                });
        }
    ].reduce(Q.when, Q(1))
        .catch(function(e){ test.ok(false, e.stack); })
        .finally(test.done)
        .done();
};



/** Test driver: common behaviors
 * @param {test|assert} test
 */
exports.testCommonDriverTest = function(test){
    var schema = this.schema;

    var defaultDriverTest = require('../node_modules/missy/tests/driver-common.js').commonDriverTest(test, schema);

    _.values(defaultDriverTest.tests)
    .reduce(Q.when, Q(1))
        .catch(function(e){ test.ok(false, e.stack); })
        .finally(test.done)
        .done();
};



/** Tear down the schema
 */
exports.tearDown = function(callback){
    if (!this.schema)
        return callback();

    var schema = this.schema,
        db = schema.getClient();

    // Collect models' collections
    var modelCollections = _.map(schema.models, function(model){
        return model.options.table;
    });

    Q()
        // Load existing collection names
        .then(function(){
            return Q.nmcall(db, 'collectionNames')
                .then(function(collections){
                    return _.map(
                        _.pluck(collections, 'name'),
                        function(collectionName){
                            var c = collectionName.split('.');
                            if (c[0] == db.databaseName)
                                c = c.slice(1);
                            return c.join('.');
                        }
                    );
                });
        })
        // Remove collections
        .then(function(existingCollections){
            var dropCollections = _.intersection(modelCollections, existingCollections);

            return _.map(
                    dropCollections,
                    function(collection){
                        return function(){
                            return Q.nmcall(db.collection(  collection  ), 'drop');
                        };
                    }
            ).reduce(Q.when, Q(1));
        })
        // Disconnect
        .then(function(){
            return schema.disconnect();
        })
        // Finish
        .nodeify(callback);
};
