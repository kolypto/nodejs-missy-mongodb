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


exports.testObjectId = function(test){
    var schema = this.schema;

    var Post = schema.define('Log', {
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
        .catch(function(e){
            test.ok(false, e.stack);
        })
        .finally(function(){
            test.done();
        }).done();
};



exports.testMongodbDriver = function(test){
    var schema = this.schema;

    var User = this.User = schema.define('User', {
        _id: Number,
        login: String,
        roles: Array
    }, { pk: '_id', table: '__test_users' });

    return [
        // insert()
        function(){
            return User.insert([
                { _id: 1, login: 'a', roles: ['admin', 'user'] },
                { _id: 2, login: 'b', roles: ['user'] },
            ])
                .then(function(entities){
                    test.equal(entities.length, 2);
                    test.deepEqual(entities[0], { _id: 1, login: 'a', roles: ['admin', 'user'] });
                    test.deepEqual(entities[1], { _id: 2, login: 'b', roles: ['user'] });
                })
        },
        // insert(): existing
        function(){
            return User.insert({ _id: 2 })
                .then(function(){ test.ok(false); })
                .catch(function(e){
                    test.ok(e instanceof missy.errors.EntityExists);
                });
        },
        // save(): insert
        function(){
            return User.save({ _id:3, login: 'd', roles: ['guest'] })
                .then(function(entity){
                    test.deepEqual(entity, { _id:3, login: 'd', roles: ['guest'] });
                });
        },
        // save(): replace
        function(){
            return User.save({ _id:3, login: 'd', roles: ['guest', 'registered'] })
                .then(function(entity){
                    test.deepEqual(entity, { _id:3, login: 'd', roles: ['guest', 'registered'] });
                });
        },
        // update(), existing
        function(){
            return User.update({ _id:3, login: 'd', roles: ['guest'], extra: 111 })
                .then(function(entity){
                    test.deepEqual(entity, { _id:3, login: 'd', roles: ['guest'], extra: 111 });
                });
        },
        // update(), missing
        function(){
            return User.update({ _id:4 })
                .then(function(entity){ test.ok(false) })
                .catch(function(e){
                    test.ok(e instanceof missy.errors.EntityNotFound)
                });
        },
        // findOne()
        // find(): projection, sort
        // find(): skip, limit
        // count()
        // remove()
        // updateQuery(), upsert=false
        // updateQuery(), upsert=true
        // updateQuery(), upsert=false, multi=true
        // removeQuery()
        // removeQuery(), multi=true
    ].reduce(Q.when, Q(1))
        .catch(function(e){
            test.ok(false, e.stack);
        })
        .finally(function(){
            test.done();
        }).done();
};



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
        .then(function(){
            return schema.disconnect();
        })
        // Finish
        .nodeify(callback);
};
