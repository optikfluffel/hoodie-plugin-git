/*
 * Copyright 2014 Xiatron LLC
 */

// Set some vars
var fs = require('fs');
var appName = require('../../package.json').name;
var ports = require('ports');
var port = ports.getPort(appName+'-hoodie-plugin-git');
var crypto = require('crypto');
var exec = require('child_process').exec;
var GitServer = require('git-server');
var users = new Array();
var servicePass = Math.random().toString(36).slice(2,11);

// Override git-server authentication to allow CouchDB admins only
GitServer.prototype.getUser = function(username, password, repo) {
    var userObject, _i, _len, _ref;
    _ref = repo.users;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        userObject = _ref[_i];
        if (userObject.user.username === username) {
            // Synchronously produce a CouchDB style admin passowrd hash
            crypted_password = new Buffer(crypto.pbkdf2Sync(password, userObject.user.salt, 10, 20), 'binary').toString('hex');

            // Look for a password or hash match
            if (userObject.user.password === password || crypted_password === userObject.user.hash) {
                return userObject;
            }
        }
    }
    return false;
};

// Run in the hoodie context
module.exports = function (hoodie, cb) {
    // Setup all of CouchDB admins as git users with read/write
    hoodie.request('GET', '_config/admins', {}, function(err, data){
        for (var i in data) {
            var pwData = data[i].replace('-pbkdf2-','').split(',');
            var userObj = {
                user: {
                    username: i,
                    hash: pwData[0],
                    salt: pwData[1],
                    password: ''
                },
                permissions:['R','W']
            }
            users.push(userObj);
        };
    });

    // Setup a service account as a git user with read/write
    var userObj = {
        user: {
            username: 'gitserv',
            hash: '',
            salt: '',
            password: servicePass
        },
        permissions:['R','W']
    }
    users.push(userObj);

    // Setup the www repository
    var wwwRepo = {
        name:'www',
        anonRead:false,
        users: users
    }

    // Start the git server
    server = new GitServer([wwwRepo], null, './', port);

    // Handle post updates
    server.on('post-update', function(update, repo) {
        if (repo.name === 'www') {
            //  Delete www, clone master to www, then delete www/.git
            exec('rm -Rf www && git clone http://gitserv:'+servicePass+'@localhost:'+port+'/www.git www && rm -Rf www/.git', function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }
    });

    // Push existing WWW on to new repo
    setTimeout(function(){
        //Count the objects
        exec('find ./www.git/objects -type f | wc -l', function (error, stdout, stderr) {

            //Push only if there's no objects
            if (parseInt(stdout) === 0) {
                exec('cd www && git init && git config user.email "gitbot@localhost" && git config user.name "gitbot" && git add . && git commit -m "First commit." && git remote add origin http://gitserv:'+servicePass+'@localhost:'+port+'/www.git && git push -u origin master', function (error, stdout, stderr) {
                    console.log(stdout);
                    console.log(stderr);
                });
            }
        });
    },4000);

    // Output something useful
    console.log('Hoodie Git Plugin: Listening on port '+port);

    //Hoodie Callback
    cb();
}
