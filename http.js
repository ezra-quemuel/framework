var http = require('http');
var qs = require('querystring');
var consts = require('./consts');

/*
    Write cookie
    @name {String}
    @value {String}
    @expires {Date} :: optional
    @options {Object} :: options.path, options.domain, options.secure, options.httpOnly, options.expires
    return {ServerResponse}
*/
http.ServerResponse.prototype.cookie = function(name, value, expires, options) {

    var builder = [name + '=' + encodeURIComponent(value)];

    if (expires && !utils.isDate(expires) && typeof(expires) === consts.OBJECT) {
        options = expires;
        expires = options.expires || options.expire || null;
    }

    if (!options)
        options = {};

    options.path = options.path || '/';

    if (expires)
        builder.push('Expires=' + expires.toUTCString());

    if (options.domain)
        builder.push('Domain=' + options.domain);

    if (options.path)
        builder.push('Path=' + options.path);

    if (options.secure)
        builder.push('Secure');

    if (options.httpOnly || options.httponly || options.HttpOnly)
        builder.push('HttpOnly');

    var self = this;

    var arr = self.getHeader('set-cookie') || [];

    arr.push(builder.join('; '));
    self.setHeader('Set-Cookie', arr);

    return self;
};

http.ServerResponse.prototype.json = function() {
    var self = this;
    self.removeHeader('Etag');
    self.removeHeader('Last-Modified');
    return self;
};

/**
 * Disable HTTP cache for current response
 * @return {Response}
 */
http.ServerResponse.prototype.noCache = function() {
    var self = this;
    self.removeHeader('Etag');
    self.removeHeader('Last-Modified');
    return self;
};

/**
 * Send
 * @param {Number} code Response status code, optional
 * @param {Object} body Body
 * @param {String} type Content-Type, optional
 * @return {Response}
 */
http.ServerResponse.prototype.send = function(code, body, type) {

    var self = this;

    if (self.headersSent)
        return self;

    var res = self;
    var req = self.req;
    var contentType = type;

    if (typeof(body) === consts.UNDEFINED) {
        body = code;
        code = 200;
    }

    switch (typeof(body)) {
        case consts.STRING:
            if (!contentType)
                contentType = 'text/html';
            break;

        case consts.NUMBER:

            if (!contentType)
                contentType = 'text/plain';

            body = utils.httpStatus(body);

            break;

        case consts.BOOLEAN:
        case consts.OBJECT:

            if (!contentType)
                contentType = 'application/json';

            body = JSON.stringify(body);
            break;
    }

    var accept = req.headers['accept-encoding'] || '';
    var headers = {};

    headers[consts.RESPONSE_HEADER_CACHECONTROL] = 'private';
    headers['Vary'] = 'Accept-Encoding';

    // Safari resolve
    if (contentType === 'application/json')
        headers[consts.RESPONSE_HEADER_CACHECONTROL] = 'private, no-cache, no-store, must-revalidate';

    if ((/text|application/).test(contentType))
        contentType += '; charset=utf-8';

    headers[consts.RESPONSE_HEADER_CONTENTTYPE] = contentType;

    res.success = true;
    req.clear(true);

    if (accept.lastIndexOf('gzip') !== -1) {
        var buffer = new Buffer(body);
        zlib.gzip(buffer, function(err, data) {

            if (err) {
                res.writeHead(code, headers);
                res.end(body, consts.ENCODING);
                return;
            }

            headers['Content-Encoding'] = 'gzip';
            headers[consts.RESPONSE_HEADER_CONTENTLENGTH] = data.length;

            res.writeHead(code, headers);
            res.end(data, consts.ENCODING);
        });

        return self;
    }

    headers[consts.RESPONSE_HEADER_CONTENTLENGTH] = body.length;

    res.writeHead(code, headers);
    res.end(body, consts.ENCODING);

    return self;
};

/**
 * Response static file
 * @return {Response}
 */
http.ServerResponse.prototype.continue = function() {
    var self = this;

    if (self.headersSent)
        return;

    framework.responseStatic(self.req, self);
    return self;
};

/**
 * Response file
 * @param {String} filename
 * @param {String} downloadName Optional
 * @param {Object} headers Optional
 * @return {Framework}
 */
http.ServerResponse.prototype.file = function(filename, downloadName, headers) {
    var self = this;
    if (self.headersSent)
        return;
    framework.responseFile(self.req, self, filename, downloadName, headers);
    return self;
};

/**
 * Response stream
 * @param {String} filename
 * @param {String} downloadName Optional
 * @param {Object} headers Optional
 * @return {Framework}
 */
http.ServerResponse.prototype.stream = function(contentType, stream, downloadName, headers) {
    var self = this;
    if (self.headersSent)
        return;
    framework.responseStream(self.req, self, contentType, stream, downloadName, headers);
    return self;
};

/**
 * Response JSON
 * @param {Object} obj
 * @return {Response}
 */
http.ServerResponse.prototype.json = function(obj) {
    return this.send(200, obj, 'application/json');
};

var _tmp = http.IncomingMessage.prototype;

http.IncomingMessage.prototype = {

    get ip() {
        var self = this;
        var proxy = self.headers['x-forwarded-for'];
        //  x-forwarded-for: client, proxy1, proxy2, ...
        if (typeof(proxy) !== consts.UNDEFINED)
            return proxy.split(',', 1)[0] || self.connection.removiewddress;
        return self.connection.remoteAddress;
    },

    get query() {
        var self = this;
        if (self._dataGET)
            return self._dataGET;
        self._dataGET = qs.parse(self.uri.query);
        return self._dataGET;
    },

    get subdomain() {

        var self = this;

        if (self._subdomain)
            return self._subdomain;

        var subdomain = self.uri.host.toLowerCase().replace(/^www\./i, '').split('.');
        if (subdomain.length > 2)
            self._subdomain = subdomain.slice(0, subdomain.length - 2); // example: [subdomain].domain.com
        else
            self._subdomain = null;

        return self._subdomain;
    },

    get host() {
        return this.headers['host'];
    },

    get isSecure() {
        return this.uri.protocol === 'https' || this.uri.protocol === 'wss';
    },

    get language() {
        return ((this.headers['accept-language'].split(';')[0] || '').split(',')[0] || '').toLowerCase();
    }
}

http.IncomingMessage.prototype.__proto__ = _tmp;

/**
 * Signature request (user-agent + ip + referer + current URL + custom key)
 * @param {String} key Custom key.
 * @return {Request}
 */
http.IncomingMessage.prototype.signature = function(key) {
    var self = this;
    return framework.encrypt((self.headers['user-agent'] || '') + '#' + self.ip + '#' + self.url + '#' + (key || ''), 'request-signature', false);
};

/**
 * Disable HTTP cache for current request
 * @return {Request}
 */
http.IncomingMessage.prototype.noCache = function() {
    var self = this;
    delete self.headers['if-none-match'];
    delete self.headers['if-modified-since'];
    return self;
};

/**
 * Read a cookie from current request
 * @param  {String} name Cookie name.
 * @return {String}      Cookie value (default: '')
 */
http.IncomingMessage.prototype.cookie = function(name) {

    var self = this;

    if (typeof(self.cookies) !== consts.UNDEFINED)
        return decodeURIComponent(self.cookies[name] || '');

    self.cookies = {};

    var cookie = self.headers['cookie'] || '';
    if (cookie.length === 0)
        return '';

    var arr = cookie.split(';');
    var length = arr.length;

    for (var i = 0; i < length; i++) {
        var c = arr[i].trim().split('=');
        self.cookies[c.shift()] = c.join('=');
    }

    return decodeURIComponent(self.cookies[name] || '');
};

/*
    Read authorization header
    return {Object}
*/
http.IncomingMessage.prototype.authorization = function() {

    var self = this;
    var authorization = self.headers['authorization'] || '';

    if (authorization === '')
        return {
            name: '',
            password: ''
        };

    var arr = new Buffer(authorization.replace('Basic ', '').trim(), 'base64').toString('utf8').split(':');
    return {
        name: arr[0] || '',
        password: arr[1] || ''
    };
};

/*
    Clear all uploaded files
    @isAuto {Booelan} :: system, internal, optional default false
    return {ServerRequest}
*/
http.IncomingMessage.prototype.clear = function(isAuto) {

    var self = this;
    var files = self.files;

    if (!files)
        return self;

    if (isAuto && self._manual)
        return self;

    var length = files.length;

    if (length === 0)
        return self;

    var arr = [];
    for (var i = 0; i < length; i++)
        arr.push(files[i].path);

    framework.unlink(arr);
    self.files = null;

    return self;
};

/*
    Return hostname with protocol and port
    @path {String} :: optional
    return {String}
*/
http.IncomingMessage.prototype.hostname = function(path) {

    var self = this;
    var uri = self.uri;

    if (typeof(path) !== consts.UNDEFINED) {
        if (path[0] !== '/')
            path = '/' + path;
    }

    return uri.protocol + '//' + uri.hostname + (uri.port !== null && typeof(uri.port) !== consts.UNDEFINED && uri.port !== 80 ? ':' + uri.port : '') + (path || '');
};

module.exports = http;