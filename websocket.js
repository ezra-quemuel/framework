module.exports = function (Framework) {

    const WebSocketDefaults = {        'default-websocket-request-length': 1024 * 5,
        'default-websocket-encodedecode': true,
        'allow-websocket': true
    };

    //TODO: Register hooks for config types
    //TODO: Register hooks for config defaults
    /*
     _.assign(framework.config, WebSocketDefaults);
     */
    //TODO: Register hooks for initialize extensions
    /*
     if (self.config['allow-websocket']) {
     self.server.on('upgrade', function (req, socket, head) {
     framework._upgrade(req, socket, head);
     });
     }
     */
    //TODO: Register hooks for injectXXX


    /*
     Add a new websocket route
     @url {String}
     @funcInitialize {Function}
     @flags {String Array or Object} :: optional
     @protocols {String Array} :: optional, websocket-allow-protocols
     @allow {String Array} :: optional, allow origin
     @maximumSize {Number} :: optional, default by the config
     @middleware {String Array} :: optional, middleware
     return {Framework}
     */
    Framework.prototype.websocket = function (url, funcInitialize, flags, protocols, allow, maximumSize, middleware, options) {

        if (url === '')
            url = '/';

        if (utils.isArray(maximumSize)) {
            var tmp = middleware;
            middleware = maximumSize;
            maximumSize = tmp;
        }

        if (typeof(funcExecute) === consts.OBJECT) {
            var tmp = flags;
            funcExecute = flags;
            flags = tmp;
        }

        if (!utils.isArray(flags) && typeof(flags) === 'object') {
            protocols = flags['protocols'] || flags['protocol'];
            allow = flags['allow'] || flags['origin'];
            maximumSize = flags['max'] || flags['length'] || flags['maximum'] || flags['maximumSize'];
            middleware = flags['middleware'];
            options = flags['options'];
            flags = flags['flags'];
        }

        if (typeof(middleware) === consts.UNDEFINED)
            middleware = null;

        var self = this;
        var priority = 0;
        var index = url.indexOf(']');
        var subdomain = null;
        var isASTERIX = url.indexOf('*') !== -1;

        priority = url.count('/');

        if (index > 0) {
            subdomain = url.substring(1, index).trim().toLowerCase().split(',');
            url = url.substring(index + 1);
            priority += 2;
        }

        if (isASTERIX) {
            url = url.replace('*', '').replace('//', '/');
            priority = (-10) - priority;
        }

        var arr = [];
        var routeURL = internal.routeSplit(url.trim());

        if (url.indexOf('{') !== -1) {
            routeURL.forEach(function (o, i) {
                if (o.substring(0, 1) === '{')
                    arr.push(i);
            });
            priority -= arr.length;
        }

        if (typeof(allow) === consts.STRING)
            allow = allow[allow];

        if (typeof(protocols) === consts.STRING)
            protocols = protocols[protocols];

        if (typeof(flags) === consts.STRING)
            flags = flags[flags];

        var isJSON = false;
        var isBINARY = false;
        var tmp = [];

        if (typeof(flags) === consts.UNDEFINED)
            flags = [];

        for (var i = 0; i < flags.length; i++) {
            flags[i] = flags[i].toString().toLowerCase();

            if (flags[i] === 'json')
                isJSON = true;

            if (flags[i] === 'binary')
                isBINARY = true;

            if (flags[i] === 'raw') {
                isBINARY = false;
                isJSON = false;
            }

            if (flags[i] !== 'json' && flags[i] !== 'binary' && flags[i] !== 'raw')
                tmp.push(flags[i]);
        }

        flags = tmp;

        priority += (flags.length * 2);

        var isMember = false;

        if (!flags || (flags.indexOf('logged') === -1 && flags.indexOf('authorize') === -1))
            isMember = true;

        self.routes.websockets.push({
            name: (_controller || '').length === 0 ? 'unknown' : _controller,
            url: routeURL,
            param: arr,
            subdomain: subdomain,
            priority: priority,
            flags: flags || [],
            onInitialize: funcInitialize,
            protocols: protocols || [],
            allow: allow || [],
            length: (maximumSize || self.config['default-websocket-request-length']) * 1024,
            isMEMBER: isMember,
            isJSON: isJSON,
            isBINARY: isBINARY,
            isASTERIX: isASTERIX,
            middleware: middleware,
            options: options
        });

        self.emit('route-add', 'websocket', self.routes.websockets[self.routes.websockets.length - 1]);

        if (_controller.length === 0)
            self.routesSort();

        return self;
    };

    Framework.prototype._upgrade = function (req, socket, head) {

        if ((req.headers.upgrade || '').toLowerCase() !== 'websocket')
            return;

        var self = this;
        var headers = req.headers;

        self.emit('websocket', req, socket, head);
        self.stats.request.websocket++;

        if (self.restrictions.isRestrictions) {
            if (self.restrictions.isAllowedIP) {
                if (self.restrictions.allowedIP.indexOf(req.ip) === -1) {
                    self.stats.response.restriction++;
                    req.connection.destroy();
                    return self;
                }
            }

            if (self.restrictions.isBlockedIP) {
                if (self.restrictions.blockedIP.indexOf(req.ip) !== -1) {
                    self.stats.response.restriction++;
                    req.connection.destroy();
                    return self;
                }
            }

            if (self.restrictions.isAllowedCustom) {
                if (!self.restrictions._allowedCustom(headers)) {
                    self.stats.response.restriction++;
                    req.connection.destroy();
                    return self;
                }
            }

            if (self.restrictions.isBlockedCustom) {
                if (self.restrictions._blockedCustom(headers)) {
                    self.stats.response.restriction++;
                    req.connection.destroy();
                    return self;
                }
            }
        }

        req.uri = parser.parse('ws://' + req.headers.host + req.url);
        req.session = null;
        req.user = null;
        req.flags = [req.isSecure ? 'https' : 'http'];

        var path = utils.path(req.uri.pathname);
        var websocket = new WebSocketClient(req, socket, head);

        req.path = internal.routeSplit(req.uri.pathname);

        if (self.onAuthorization === null) {
            var route = self.lookup_websocket(req, websocket.uri.pathname, true);

            if (route === null) {
                websocket.close();
                req.connection.destroy();
                return;
            }

            self._upgrade_continue(route, req, websocket, path);
            return;
        }

        self.onAuthorization.call(self, req, websocket, req.flags, function (isLogged, user) {

            if (user)
                req.user = user;

            req.flags.push(isLogged ? 'authorize' : 'unauthorize');

            var route = self.lookup_websocket(req, websocket.uri.pathname, false);

            if (route === null) {
                websocket.close();
                req.connection.destroy();
                return;
            }

            self._upgrade_continue(route, req, websocket, path);
        });

    };

    Framework.prototype._upgrade_continue = function (route, req, socket, path) {

        var self = this;

        if (!socket.prepare(route.flags, route.protocols, route.allow, route.length, self.version_header)) {
            socket.close();
            req.connection.destroy();
            return self;
        }

        var id = path + (route.flags.length > 0 ? '#' + route.flags.join('-') : '');

        if (route.isBINARY)
            socket.type = 1;
        else if (route.isJSON)
            socket.type = 3;

        var next = function () {

            if (typeof(self.connections[id]) === consts.UNDEFINED) {
                var connection = new WebSocket(self, path, route.name, id);
                self.connections[id] = connection;
                route.onInitialize.apply(connection, internal.routeParam(route.param.length > 0 ? internal.routeSplit(req.uri.pathname, true) : req.path, route));
            }

            socket.upgrade(self.connections[id]);

        };

        if (route.middleware instanceof Array && route.middleware.length > 0) {

            var func = [];

            for (var i = 0, length = route.middleware.length; i < length; i++) {

                var middleware = framework.routes.middleware[file.middleware[i]];

                if (!middleware)
                    continue;

                (function (middleware) {
                    func.push(function (next) {
                        middleware.call(framework, req, res, next, route.options);
                    });
                })(middleware);

            }

            func._async_middleware(res, next);

        } else
            next();

        return self;
    };

    /*
     Internal function
     @req {HttpRequest}
     @url {String}
     return {WebSocketRoute}
     */
    Framework.prototype.lookup_websocket = function (req, url, noLoggedUnlogged) {

        var self = this;
        var subdomain = req.subdomain === null ? null : req.subdomain.join('.');
        var length = self.routes.websockets.length;

        for (var i = 0; i < length; i++) {

            var route = self.routes.websockets[i];

            if (!internal.routeCompareSubdomain(subdomain, route.subdomain))
                continue;

            if (route.isASTERIX) {
                if (!internal.routeCompare(req.path, route.url, false, true))
                    continue;
            } else {
                if (!internal.routeCompare(req.path, route.url, false))
                    continue;
            }

            if (route.flags !== null && route.flags.length > 0) {

                var result = internal.routeCompareFlags(req.flags, route.flags, noLoggedUnlogged ? true : route.isMEMBER);

                if (result === -1)
                    req.isAuthorized = false;

                if (result < 1)
                    continue;

            }

            return route;
        }

        return null;
    };

// *********************************************************************************
// =================================================================================
// Framework.WebSocket
// =================================================================================
// *********************************************************************************

    var NEWLINE = '\r\n';
    var SOCKET_RESPONSE = 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nX-Powered-By: {0}\r\nSec-WebSocket-Accept: {1}\r\n\r\n';
    var SOCKET_RESPONSE_ERROR = 'HTTP/1.1 403 Forbidden\r\nConnection: close\r\nX-WebSocket-Reject-Reason: 403 Forbidden\r\n\r\n';
    var SOCKET_HASH = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    var SOCKET_ALLOW_VERSION = [13];

    /*
     WebSocket
     @framework {total.js}
     @path {String}
     @name {String} :: Controller name
     return {WebSocket}
     */
    function WebSocket(framework, path, name, id) {
        this._keys = [];
        this.id = id;
        this.online = 0;
        this.connections = {};
        this.repository = {};
        this.name = name;
        this.url = utils.path(path);

        // on('open', function(client) {});
        // on('close', function(client) {});
        // on('message', function(client, message) {});
        // on('error', function(error, client) {});
        events.EventEmitter.call(this);
    }

    WebSocket.prototype = {

        get global() {
            return framework.global;
        },

        get config() {
            return framework.config;
        },

        get cache() {
            return framework.cache;
        },

        get isDebug() {
            return framework.config.debug;
        },

        get path() {
            return framework.path;
        },

        get fs() {
            return framework.fs;
        },

        get isSecure() {
            return this.req.isSecure;
        },

        get async() {

            var self = this;

            if (typeof(self._async) === UNDEFINED)
                self._async = new utils.Async(self);

            return self._async;
        }
    }

    WebSocket.prototype.__proto__ = Object.create(events.EventEmitter.prototype, {
        constructor: {
            value: WebSocket,
            enumberable: false
        }
    });

    /*
     Send message
     @message {String or Object}
     @id {String Array}
     @blacklist {String Array}
     return {WebSocket}
     */
    WebSocket.prototype.send = function (message, id, blacklist) {

        var self = this;
        var keys = self._keys;
        var length = keys.length;

        if (length === 0)
            return self;

        var fn = typeof(blacklist) === FUNCTION ? blacklist : null;
        var is = blacklist instanceof Array;

        if (typeof(id) === UNDEFINED || id === null || id.length === 0) {

            for (var i = 0; i < length; i++) {

                var _id = keys[i];

                if (is && blacklist.indexOf(_id) !== -1)
                    continue;

                var conn = self.connections[_id];

                if (fn !== null && !fn.call(self, _id, conn))
                    continue;

                conn.send(message);
                framework.stats.response.websocket++;
            }

            self.emit('send', message, null, []);
            return self;
        }

        fn = typeof(id) === FUNCTION ? id : null;
        is = id instanceof Array;

        for (var i = 0; i < length; i++) {

            var _id = keys[i];

            if (is && id.indexOf(_id) === -1)
                continue;

            var conn = self.connections[_id];

            if (fn !== null && !fn.call(self, _id, conn) === -1)
                continue;

            conn.send(message);
            framework.stats.response.websocket++;
        }

        self.emit('send', message, id, blacklist);
        return self;
    };

    /*
     Close connection
     @id {String Array} :: optional, default null
     @message {String} :: optional
     @code {Number} :: optional, default 1000
     return {WebSocket}
     */
    WebSocket.prototype.close = function (id, message, code) {

        var self = this;
        var keys = self._keys;

        if (typeof(id) === STRING) {
            code = message;
            message = id;
            id = null;
        }

        if (keys === null)
            return self;

        var length = keys.length;

        if (length === 0)
            return self;

        if (typeof(id) === UNDEFINED || id === null || id.length === 0) {
            for (var i = 0; i < length; i++) {
                var _id = keys[i];
                self.connections[_id].close(message, code);
                self._remove(_id);
            }
            self._refresh();
            return self;
        }

        var is = id instanceof Array;
        var fn = typeof(id) === FUNCTION ? id : null;

        for (var i = 0; i < length; i++) {

            var _id = keys[i];

            if (is && id.indexOf(_id) === -1)
                continue;

            var conn = self.connections[_id];

            if (fn !== null && !fn.call(self, _id, conn))
                continue;

            conn.close(message, code);
            self._remove(_id);
        }

        self._refresh();
        return self;
    };

    /*
     Error
     @err {Error}
     return {Framework}
     */
    WebSocket.prototype.error = function (err) {
        var self = this;
        framework.error(typeof(err) === STRING ? new Error(err) : err, self.name, self.path);
        return self;
    };

    /*
     Problem
     @message {String}
     return {Framework}
     */
    WebSocket.prototype.problem = function (message) {
        var self = this;
        framework.problem(message, self.name, self.uri);
        return self;
    };

    /*
     Change
     @message {String}
     return {Framework}
     */
    WebSocket.prototype.change = function (message) {
        var self = this;
        framework.change(message, self.name, self.uri, self.ip);
        return self;
    };


    /*
     All connections (forEach)
     @fn {Function} :: function(client, index) {}
     return {WebSocketClient};
     */
    WebSocket.prototype.all = function (fn) {

        var self = this;
        var length = self._keys.length;

        for (var i = 0; i < length; i++) {
            var id = self._keys[i];
            if (fn(self.connections[id], i))
                break;
        }

        return self;
    };

    /*
     Find a connection
     @id {String or Function} :: function(client, id) {}
     return {WebSocketClient}
     */
    WebSocket.prototype.find = function (id) {
        var self = this;
        var length = self._keys.length;
        var isFn = typeof(id) === FUNCTION;

        for (var i = 0; i < length; i++) {
            var connection = self.connections[self._keys[i]];

            if (!isFn) {
                if (connection.id === id)
                    return connection;
                continue;
            }

            if (id(connection, connection.id))
                return connection;
        }

        return null;
    };

    /*
     Destroy a websocket
     */
    WebSocket.prototype.destroy = function () {
        var self = this;

        if (self.connections === null && self._keys === null)
            return self;

        self.close();
        self.connections = null;
        self._keys = null;
        delete framework.connections[self.id];
        self.emit('destroy');
        return self;
    };

    /*
     Send proxy request
     @url {String}
     @obj {Object}
     @fnCallback {Function} :: optional
     return {Controller}
     */
    WebSocket.prototype.proxy = function (url, obj, fnCallback) {

        var self = this;
        var headers = {
            'X-Proxy': 'total.js'
        };
        headers[RESPONSE_HEADER_CONTENTTYPE] = 'application/json';

        if (typeof(obj) === FUNCTION) {
            var tmp = fnCallback;
            fnCallback = obj;
            obj = tmp;
        }

        utils.request(url, 'POST', obj, function (error, data, code, headers) {

            if (!fnCallback)
                return;

            if ((headers['content-type'] || '').indexOf('application/json') !== -1)
                data = JSON.parse(data);

            fnCallback.call(self, error, data, code, headers);

        }, headers);

        return self;
    };

    /*
     Internal function
     return {WebSocket}
     */
    WebSocket.prototype._refresh = function () {
        var self = this;
        self._keys = Object.keys(self.connections);
        self.online = self._keys.length;
        return self;
    };

    /*
     Internal function
     @id {String}
     return {WebSocket}
     */
    WebSocket.prototype._remove = function (id) {
        var self = this;
        delete self.connections[id];
        return self;
    };

    /*
     Internal function
     @client {WebSocketClient}
     return {WebSocket}
     */
    WebSocket.prototype._add = function (client) {
        var self = this;
        self.connections[client._id] = client;
        return self;
    };

    /*
     Module caller
     @name {String}
     return {Module};
     */
    WebSocket.prototype.module = function (name) {
        return framework.module(name);
    };

    /*
     Get a model
     @name {String} :: name of model
     return {Object};
     */
    WebSocket.prototype.model = function (name) {
        return framework.model(name);
    };

    /*
     Get a model
     @name {String} :: name of model
     return {Object};
     */
    WebSocket.prototype.component = function (name) {

        var self = this;
        var component = framework.component(name);

        if (component === null)
            return '';

        var length = arguments.length;
        var params = [];

        for (var i = 1; i < length; i++)
            params.push(arguments[i]);

        var output = component.render.apply(self, params);
        return output;
    };

    /*
     Render component to string
     @name {String}
     return {String}
     */
    WebSocket.prototype.helper = function (name) {
        var self = this;
        var helper = framework.helpers[name] || null;

        if (helper === null)
            return '';

        var length = arguments.length;
        var params = [];

        for (var i = 1; i < length; i++)
            params.push(arguments[i]);

        return helper.apply(self, params);
    };

    /*
     Controller functions reader
     @name {String} :: name of controller
     return {Object};
     */
    WebSocket.prototype.functions = function (name) {
        return (framework.controllers[name] || {}).functions;
    };

    /*
     Return database
     @name {String}
     return {Database};
     */
    WebSocket.prototype.database = function () {
        return framework.database.apply(framework, arguments);
    };

    /*
     Resource reader
     @name {String} :: filename
     @key {String}
     return {String};
     */
    WebSocket.prototype.resource = function (name, key) {
        return framework.resource(name, key);
    };

    /*
     Log
     @arguments {Object array}
     return {WebSocket};
     */
    WebSocket.prototype.log = function () {
        var self = this;
        framework.log.apply(framework, arguments);
        return self;
    };

    /*
     Validation / alias for validate
     return {ErrorBuilder}
     */
    WebSocket.prototype.validation = function (model, properties, prefix, name) {
        return this.validate(model, properties, prefix, name);
    };

    /*
     Validation object
     @model {Object} :: object to validate
     @properties {String array} : what properties?
     @prefix {String} :: prefix for resource = prefix + model name
     @name {String} :: name of resource
     return {ErrorBuilder}
     */
    WebSocket.prototype.validate = function (model, properties, prefix, name) {

        var self = this;

        var resource = function (key) {
            return self.resource(name || 'default', (prefix || '') + key);
        };

        var error = new builders.ErrorBuilder(resource);
        return utils.validate.call(self, model, properties, framework.onValidation, error);
    };

    /*
     Add function to async wait list
     @name {String}
     @waitingFor {String} :: name of async function
     @fn {Function}
     return {WebSocket}
     */
    WebSocket.prototype.wait = function (name, waitingFor, fn) {
        var self = this;
        self.async.wait(name, waitingFor, fn);
        return self;
    };

    /*
     Run async functions
     @callback {Function}
     return {WebSocket}
     */
    WebSocket.prototype.complete = function (callback) {
        var self = this;
        return self.complete(callback);
    };

    /*
     Add function to async list
     @name {String}
     @fn {Function}
     return {WebSocket}
     */
    WebSocket.prototype.await = function (name, fn) {
        var self = this;
        self.async.await(name, fn);
        return self;
    };

    /*
     WebSocketClient
     @req {Request}
     @socket {Socket}
     @head {Buffer}
     */
    function WebSocketClient(req, socket, head) {

        this.handlers = {
            ondata: this._ondata.bind(this),
            onerror: this._onerror.bind(this),
            onclose: this._onclose.bind(this)
        };

        this.container = null;
        this._id = null;
        this.id = '';
        this.socket = socket;
        this.req = req;
        this.isClosed = false;
        this.errors = 0;
        this.buffer = new Buffer(0);
        this.length = 0;
        this.cookie = req.cookie.bind(req);

        // 1 = raw - not implemented
        // 2 = plain
        // 3 = JSON

        this.type = 2;
        this._isClosed = false;
    }

    WebSocketClient.prototype = {

        get protocol() {
            return (req.headers['sec-websocket-protocol'] || '').replace(/\s/g, '').split(',');
        },

        get ip() {
            return this.req.ip;
        },

        get get() {
            return this.req.query;
        },

        get uri() {
            return this.req.uri;
        },

        get config() {
            return this.container.config;
        },

        get global() {
            return this.container.global;
        },

        get session() {
            return this.req.session;
        },

        set session(value) {
            this.req.session = value;
        },

        get user() {
            return this.req.user;
        },

        set user(value) {
            this.req.user = value;
        }
    };

    WebSocketClient.prototype.__proto__ = Object.create(events.EventEmitter.prototype, {
        constructor: {
            value: WebSocketClient,
            enumberable: false
        }
    });

    /*
     Internal function
     @allow {String Array} :: allow origin
     @protocols {String Array} :: allow protocols
     @flags {String Array} :: flags
     return {Boolean}
     */
    WebSocketClient.prototype.prepare = function (flags, protocols, allow, length, version) {

        var self = this;

        flags = flags || [];
        protocols = protocols || [];
        allow = allow || [];

        self.length = length;

        var origin = self.req.headers['origin'] || '';

        if (allow.length > 0) {

            if (allow.indexOf('*') === -1) {
                for (var i = 0; i < allow.length; i++) {
                    if (origin.indexOf(allow[i]) === -1)
                        return false;
                }
            }

        } else {

            if (origin.indexOf(self.req.headers.host) === -1)
                return false;
        }

        if (protocols.length > 0) {
            for (var i = 0; i < protocols.length; i++) {
                if (self.protocol.indexOf(protocols[i]) === -1)
                    return false;
            }
        }

        if (SOCKET_ALLOW_VERSION.indexOf(utils.parseInt(self.req.headers['sec-websocket-version'])) === -1)
            return false;

        self.socket.write(new Buffer(SOCKET_RESPONSE.format('total.js v' + version, self._request_accept_key(self.req)), 'binary'));

        self._id = (self.ip || '').replace(/\./g, '') + utils.GUID(20);
        self.id = self._id;

        return true;
    };

    /*
     Internal function
     @container {WebSocket}
     return {WebSocketClient}
     */
    WebSocketClient.prototype.upgrade = function (container) {

        var self = this;
        self.container = container;

        //self.socket.setTimeout(0);
        //self.socket.setNoDelay(true);
        //self.socket.setKeepAlive(true, 0);

        self.socket.on('data', self.handlers.ondata);
        self.socket.on('error', self.handlers.onerror);
        self.socket.on('close', self.handlers.onclose);
        self.socket.on('end', self.handlers.onclose);

        self.container._add(self);
        self.container._refresh();

        self.container.framework.emit('websocket-begin', self.container, self);
        self.container.emit('open', self);

        return self;
    };

    /*
     MIT
     Written by Jozef Gula
     ---------------------
     Internal handler
     @data {Buffer}
     */
    WebSocketClient.prototype._ondata = function (data) {

        var self = this;

        if (data != null)
            self.buffer = Buffer.concat([self.buffer, data]);

        if (self.buffer.length > self.length) {
            self.errors++;
            self.container.emit('error', new Error('Maximum request length exceeded.'), self);
            return;
        }

        switch (self.buffer[0] & 0x0f) {
            case 0x01:

                // text message or JSON message
                if (self.type !== 1)
                    self.parse();

                break;
            case 0x02:

                // binary message
                if (self.type === 1)
                    self.parse();

                break;
            case 0x08:
                // close
                self.close();
                break;
            case 0x09:
                // ping
                self.socket.write(self._state('pong'));
                break;
            case 0x0a:
                // pong
                break;
        }
    };

// MIT
// Written by Jozef Gula
    WebSocketClient.prototype.parse = function () {

        var self = this;

        var bLength = self.buffer[1];

        if (((bLength & 0x80) >> 7) !== 1)
            return self;

        var length = utils.getMessageLength(self.buffer, self.container.framework.isLE);
        var index = (self.buffer[1] & 0x7f);

        index = (index == 126) ? 4 : (index == 127 ? 10 : 2);

        if ((index + length + 4) > (self.buffer.length))
            return self;

        var mask = new Buffer(4);
        self.buffer.copy(mask, 0, index, index + 4);

        // TEXT
        if (self.type !== 1) {
            var output = '';
            for (var i = 0; i < length; i++)
                output += String.fromCharCode(self.buffer[index + 4 + i] ^ mask[i % 4]);

            // JSON
            if (self.type === 3) {
                try {
                    self.container.emit('message', self, JSON.parse(self.container.config['default-websocket-encodedecode'] === true ? decodeURIComponent(output) : output));
                } catch (ex) {
                    self.errors++;
                    self.container.emit('error', new Error('JSON parser: ' + ex.toString()), self);
                }
            } else
                self.container.emit('message', self, self.container.config['default-websocket-encodedecode'] === true ? decodeURIComponent(output) : output);

        } else {
            var binary = new Buffer(length);
            for (var i = 0; i < length; i++)
                binary.write(self.buffer[index + 4 + i] ^ mask[i % 4]);
            self.container.emit('message', self, binary);
        }

        self.buffer = self.buffer.slice(index + length + 4, self.buffer.length);
        if (self.buffer.length >= 2)
            self.parse(null);

        return self;
    };

    /*
     Internal handler
     */
    WebSocketClient.prototype._onerror = function (error) {
        var self = this;
        if (error.stack.indexOf('ECONNRESET') !== -1 || error.stack.indexOf('socket is closed') !== -1 || error.stack.indexOf('EPIPE') !== -1)
            return;
        self.container.emit('error', error, self);
    };

    /*
     Internal handler
     */
    WebSocketClient.prototype._onclose = function () {
        var self = this;

        if (self._isClosed)
            return;

        self._isClosed = true;
        self.container._remove(self._id);
        self.container._refresh();
        self.container.emit('close', self);
        self.container.framework.emit('websocket-end', self.container, self);
    };

    /*
     Send message
     @message {String or Object}
     return {WebSocketClient}
     */
    WebSocketClient.prototype.send = function (message) {

        var self = this;

        if (self.isClosed)
            return;

        if (self.type !== 1) {

            var data = self.type === 3 ? JSON.stringify(message) : (message || '').toString();
            if (self.container.config['default-websocket-encodedecode'] === true && data.length > 0)
                data = encodeURIComponent(data);

            self.socket.write(utils.getWebSocketFrame(0, data, 0x01));

        } else {

            if (message !== null)
                self.socket.write(utils.getWebSocketFrame(0, message, 0x02));

        }

        return self;
    };

    /*
     Close connection
     return {WebSocketClient}
     */
    WebSocketClient.prototype.close = function (message, code) {
        var self = this;

        if (self.isClosed)
            return self;

        self.isClosed = true;
        self.socket.end(utils.getWebSocketFrame(code || 1000, message || '', 0x08));

        return self;
    };

    /*
     Send state
     return {Buffer}
     */
    WebSocketClient.prototype._state = function (type) {
        var value = new Buffer(6);
        switch (type) {
            case 'close':
                value[0] = 0x08;
                value[0] |= 0x80;
                value[1] = 0x80;
                break;
            case 'ping':
                value[0] = 0x09;
                value[0] |= 0x80;
                value[1] = 0x80;
                break;
            case 'pong':
                value[0] = 0x0A;
                value[0] |= 0x80;
                value[1] = 0x80;
                break;
        }
        var iMask = Math.floor(Math.random() * 255);
        value[2] = iMask >> 8;
        value[3] = iMask;
        iMask = Math.floor(Math.random() * 255);
        value[4] = iMask >> 8;
        value[5] = iMask;
        return value;
    };

    WebSocketClient.prototype._request_accept_key = function (req) {
        var sha1 = crypto.createHash('sha1');
        sha1.update((req.headers['sec-websocket-key'] || '') + SOCKET_HASH);
        return sha1.digest('base64');
    };
}
