var express = require('express'),
    mongodb = require('mongodb'),
    q = require('q'),
    uuid = require('node-uuid');

var mongoServer = 'localhost',
    mongoPort = 27017,
    dbName = 'weather',
    webPort = 3000,
    mongoUrl = 'mongodb://' + mongoServer + ':' + mongoPort + '/' + dbName;

var app = express();
app.use(express.bodyParser());

var db = mongodb.connect(mongoUrl, function(err, db) {
    console.log('connected to ' + mongoUrl + '...');

    app.param('collectionName', function (req, res, next, collectionName) {
        req.collection = db.collection(collectionName);
        return next();
    });

    app.get('/', function (req, res) {
        res.send('collection name required, e.g., /messages');
    });

    app.get('/:collectionName', function (req, res) {
        req.collection.find({}, {limit: 10}).toArray(function (e, results) {
            res.send(e || results);
        })
    });

    app.post('/:collectionName', function (req, res) {
        function existsId(id) {
            var deferred = q.defer();
            req.collection.count({_id: id}, function(e, result) {
                if (e) {
                    deferred.reject(e);
                } else {
                    deferred.resolve(!!result);
                }

            });
            return deferred.promise;
        }

        function findUniqueRandomId() {
            var deferred = q.defer(),
                id = uuid.v4();

            existsId(id).then(function(exists) {
                if (!exists) {
                    deferred.resolve(id);
                } else {
                    console.error('Whoa! An astronomically improbable event occured.')
                    findUniqueRandomId().then(function(next) {
                        deferred.resolve(next);
                    });
                }

                return deferred.promise;
            });

            findUniqueRandomId().then(function(guid) {
                req.body._id = guid;
                req.collection.insert(req.body, {}, function (e, results) {
                    res.send(e || results)
                });
            });
        }


        app.get('/:collectionName/:id', function (req, res) {
            req.collection.findOne({_id: req.collection.id(req.params.id)}, function (e, result) {
                res.send(e || result);
            });
        })
        app.put('/:collectionName/:id', function (req, res) {
            req.collection.update({_id: req.collection.id(req.params.id)}, {$set: req.body}, {safe: true, multi: false}, function (e, result) {
                res.send(e || (result === 1) ? {msg: 'success'} : {msg: 'error'});
            });
        });
        app.del('/:collectionName/:id', function (req, res) {
            req.collection.remove({_id: req.collection.id(req.params.id)}, function (e, result) {
                res.send(e || (result === 1) ? {msg: 'success'} : {msg: 'error'});
            });
        });


        app.listen(webPort);

        console.log('Listening on port ' + webPort);
    });
});

