'use strict';

var _ = require('lodash')
    ;

/** Convert MissyCriteria to MongoDB format
 * @param {MissyCriteria} criteria
 * @returns {Object}
 */
var prepareCriteria = exports.prepareCriteria = function(criteria){
    /* MissyCriteria is almost compatible with MongoDB:
     * The $eq operator does not exist in MongoDB, so we convert
     *   { field: { $eq: value } }
     * to
     *   { field: value }
     */
    var c = criteria.criteria;
    return _.transform(c, function(res, test, fieldName){
        if (_.isObject(test) && '$eq' in test)
            res[fieldName] = test.$eq;
    }, _.clone(c));
};

/** Convert MissyProjection to MongoDB format
 * @param {MissyProjection} fields
 * @returns {Object}
 */
var prepareProjection = exports.prepareProjection = function(fields){
    // MissyProjection is 1:1 compatible with MongoDB
    return fields.projection;
};

/** Convert MissySort to MongoDB format
 * @param {MissyProjection} sort
 * @returns {Object}
 */
var prepareSort = exports.prepareSort = function(sort){
    // MissySort is 1:1 compatible with MongoDB
    return sort.sort;
};

/** Convert MissyUpdate to MongoDB format
 * @param {MissyUpdate} update
 * @returns {Object}
 */
var prepareUpdate = exports.prepareUpdate = function(update){
    // MissyUpdate is 1:1 compatible with MongoDB
    return update.update;
};

/** Use findAndModify on entities
 * @param {Collection} collection
 * @param {Array.<Object>} entities
 * @param {function(Object?)} entityCallback
 * @param {Object} options
 * @returns {Q} -> entities
 */
var findAndModifyEntities = exports.findAndModifyEntities = function(collection, entities, entityCallback, options){
    var results = [];
    return _.map(
        entities,
        function(entity){
            // Lookup
            var criteria = _.pick(entity, '_id'); // pick primary key
            return Q.nmcall(collection, 'findAndModify',
                criteria,
                {},
                entity,
                options
            )
                // Handle the result
                .then(entityCallback)
                .then(function(doc){
                    results.push(doc);
                });
        }).reduce(Q.when, Q(1))
        .thenResolve(results);
};
