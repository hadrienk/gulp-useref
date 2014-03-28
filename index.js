'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var useref = require('useref');
var path = require('path');
var fs = require('fs');
var glob = require('glob');

var restoreStream = through.obj();

var streamAssets = function () {
    return through.obj(function (file, enc, cb) {
        var output = useref(file.contents.toString());
        var assets = output[1];

        ['css', 'js'].forEach(function (type) {
            var files = assets[type];
            if (files) {
                Object.keys(files).forEach(function (name) {
                    var buffer = [];
                    var filepaths = files[name].assets;

                    var searchPaths;
                    if (files[name].searchPaths) {
                        searchPaths = path.join(file.cwd, files[name].searchPaths);
                    }

                    filepaths.forEach(function (filepath) {
                        filepath = path.join((searchPaths || file.base), filepath);
                        filepath = glob.sync(filepath);
                        try {
                            buffer.push(fs.readFileSync(filepath[0]));
                        } catch (err) {
                            this.emit('error', new gutil.PluginError('gulp-useref', err));
                        }
                    }.bind(this));

                    var joinedFile = new gutil.File({
                        cwd: file.cwd,
                        base: file.base,
                        path: path.join(file.base, name),
                        contents: new Buffer(buffer.join(gutil.linefeed))
                    });

                    this.push(joinedFile);

                }.bind(this));
            }
        }.bind(this));

        restoreStream.write(file, cb);
    });
};

var stream = function () {
    return through.obj(function (file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-useref', 'Streaming not supported'));
            return cb();
        }

        var output = useref(file.contents.toString());
        var html = output[0];

        try {
            file.contents = new Buffer(html);
        } catch (err) {
            this.emit('error', new gutil.PluginError('gulp-useref', err));
        }

        this.push(file);

        cb();
    });
};

stream.restore = function () {
    return restoreStream;
};

module.exports = stream;

module.exports.assets = streamAssets;
