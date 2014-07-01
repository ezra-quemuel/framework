var fs = require('fs');
var consts = require('./consts');

function FrameworkFileSystem(framework) {

    this.config = framework.config;

    this.create = {
        css: this.createCSS.bind(this),
        js: this.createJS.bind(this),
        view: this.createView.bind(this),
        content: this.createContent.bind(this),
        template: this.createTemplate.bind(this),
        resource: this.createResource.bind(this),
        temporary: this.createTemporary.bind(this),
        worker: this.createWorker.bind(this),
        file: this.createFile.bind(this)
    };

    this.rm = {
        css: this.deleteCSS.bind(this),
        js: this.deleteJS.bind(this),
        view: this.deleteView.bind(this),
        content: this.deleteContent.bind(this),
        template: this.deleteTemplate.bind(this),
        resource: this.deleteResource.bind(this),
        temporary: this.deleteTemporary.bind(this),
        worker: this.deleteWorker.bind(this),
        file: this.deleteFile.bind(this)
    };
}


var frameworkFileSystemFns = [
    {name: 'CSS', ext: '.css', dir: 'public', staticDir: 'css'},
    {name: 'JS', ext: consts.EXTENSION_JS, dir: 'public', staticDir: 'js'},
    {name: 'View', ext: '.html', dir: 'views', verify: true},
    {name: 'Template', ext: '.html', dir: 'templates', verify: true},
    {name: 'Content', ext: '.html', dir: 'contents', verify: true},
    {name: 'Worker', ext: consts.EXTENSION_JS, dir: 'workers', verify: true},
    {name: 'Resource', ext: '.resource', dir: 'resources', verify: true, transformer: transformResource},
    {name: 'Temporary', dir: 'temp', skipCreate: true}
];

frameworkFileSystemFns.forEach(function (fn) {
    FrameworkFileSystem.prototype['delete' + fn.name] = function (name) {
        if (fn.ext && name.lastIndexOf(fn.ext) === -1)
            name += fn.ext;

        var filename = utils.combine(this.config['directory-' + fn.dir] || '', this.config['static-url-' + fn.staticDir] || '', name);
        return this.deleteFile(filename);
    };
    if (fn.skipCreate) return;
    FrameworkFileSystem.prototype['create' + fn.name] = function (name, content, rewrite, append) {
        if ((content || '').length === 0)
            return false;

        if (fn.ext && name.lastIndexOf(fn.ext) === -1)
            name += fn.ext;

        if (fn.verify) framework._verify_directory(fn.dir);

        var filename = utils.combine(this.config['directory-' + fn.dir] || '', this.config['static-url-' + fn.staticDir] || '', name);
        return this.createFile(filename, fn.transformer ? fn.transformer(content) : content, append, rewrite);
    }
});

/*
 Internal :: Delete a file
 @name {String}
 return {Boolean}
 */
FrameworkFileSystem.prototype.deleteFile = function (filename) {
    fs.exists(filename, function (exist) {
        if (!exist)
            return;
        fs.unlink(filename);
    });

    return true;
};


function transformResource(content) {
    if (typeof(content) === consts.OBJECT) {
        var builder = '';
        Object.keys(content).forEach(function (o) {
            builder += o.padRight(20, ' ') + ': ' + content[o] + '\n';
        });
        return builder;
    }
    return content;
}

/*
 Create a temporary file
 @name {String}
 @stream {Stream}
 @callback {Function} :: function(err, filename) {}
 return {Boolean}
 */
FrameworkFileSystem.prototype.createTemporary = function (name, stream, callback) {
    var self = this;

    framework._verify_directory('temp');

    var filename = utils.combine(self.config['directory-temp'], name);
    var writer = fs.createWriteStream(filename);

    if (callback) {
        writer.on('error', function (err) {
            callback(err, filename);
        });
        writer.on('end', function () {
            callback(null, filename);
        });
    }

    stream.pipe(writer);
    return self;
};

/*
 Internal :: Create a file with the content
 @filename {String}
 @content {String}
 @append {Boolean}
 @rewrite {Boolean}
 @callback {Function} :: optional
 return {Boolean}
 */
FrameworkFileSystem.prototype.createFile = function (filename, content, append, rewrite, callback) {
    var self = this;
    if (content.substring(0, 7) === 'http://' || content.substring(0, 8) === 'https://') {
        utils.request(content, 'GET', null, function (err, data) {
            if (!err)
                self.createFile(filename, data, append, rewrite);

            if (typeof(callback) === consts.FUNCTION)
                callback(err, filename);
        });
        return true;
    }

    if ((content || '').length === 0)
        return false;

    var exists = fs.existsSync(filename);

    if (exists && append) {
        var data = fs.readFileSync(filename).toString(consts.ENCODING);

        if (data.indexOf(content) === -1) {
            fs.appendFileSync(filename, '\n' + content);
            return true;
        }
        return false;
    }

    if (exists && !rewrite)
        return false;

    fs.writeFileSync(filename, content, consts.ENCODING);

    if (typeof(callback) === consts.FUNCTION)
        callback(null, filename);

    return true;
};


function FrameworkPath(framework) {
    this.config = framework.config;
}

var frameworkPathFns = [
    {name: 'public'},
    {name: 'logs'},
    {name: 'views'},
    {name: 'templates'},
    {name: 'workers'},
    {name: 'databases'},
    {name: 'contents'},
    {name: 'modules'},
    {name: 'controllers'},
    {name: 'definitions'},
    {name: 'tests'},
    {name: 'resources'},
    {name: 'components', skipVerify: true},
    {name: 'models', skipVerify: true},
    {name: 'temp'}
];

frameworkPathFns.forEach(function (fn) {
    FrameworkPath.prototype[fn.name] = function (filename) {
        if (fn.skipVerify) framework._verify_directory(fn.name);
        return utils.combine(this.config['directory-' + fn.name], filename || '').replace(/\\/g, '/');
    }
});

var frameworkPathAliases = [
    {name: 'temporary', aliasTo: 'temp', deprecate: false}
];

var utils = require('./utils.js');
utils.defineAliases(FrameworkPath, frameworkPathAliases);

/*
 @filename {String} :: optional
 return {String}
 */
FrameworkPath.prototype.root = function (filename) {
    return path.join(directory, filename || '');
};


exports.FrameworkFileSystem = FrameworkFileSystem;
exports.FrameworkPath = FrameworkPath;