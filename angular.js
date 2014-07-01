module.exports = function (Controller) {

    /*
     Include: Angular.js CDN into the head
     @version {String}
     @name {String or String Array} :: optional, example: route or resource
     return {String}
     */
    Controller.prototype.$ng = function (name) {
        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ng(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ng(name[i]);
            return '';
        }

        var isCommon = name[0] === '~';

        if (isCommon)
            name = name.substring(1);

        if (typeof(name) === consts.UNDEFINED)
            name = 'angular';

        if (name === 'core' || name === '' || name === 'base' || name === 'main')
            name = 'angular';

        if (name !== 'angular' && name.indexOf('angular-') === -1)
            name = 'angular-' + name;

        var output = self.repository[REPOSITORY_ANGULAR] || '';
        var script = self.$script_create((isCommon ? '/common/' + name + '.min.js' : '//cdnjs.cloudflare.com/ajax/libs/angular.js/' + self.config['angular-version'] + '/' + name + '.min.js'));

        if (name === 'angular')
            output = script + output;
        else
            output += script;

        self.repository[REPOSITORY_ANGULAR] = output;
        return '';
    };


    Controller.prototype.$ngCommon = function (name) {

        var self = this;
        var length = arguments.length;

        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngCommon(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngCommon(name[i]);
            return '';
        }

        var output = self.repository[REPOSITORY_ANGULAR_COMMON] || '';

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var script = self.$script_create('/common/' + name);
        output += script;

        self.repository[REPOSITORY_ANGULAR_COMMON] = output;
        return '';
    };

    Controller.prototype.$ngLocale = function (name) {

        var self = this;
        var length = arguments.length;

        if (length > 2) {
            for (var i = 1; i < length; i++)
                self.$ngLocale(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngLocale(name[i]);
            return '';
        }

        var output = self.repository[REPOSITORY_ANGULAR_LOCALE] || '';
        var isLocal = name[0] === '~';
        var extension = '';

        if (isLocal)
            name = name.substring(1);

        if (name.indexOf('angular-locale_') !== -1)
            name = name.replace('angular-locale_', '');

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            extension = EXTENSION_JS;

        output += self.$script_create(isLocal ? '/i18n/angular-locale_' + name + extension : '//cdnjs.cloudflare.com/ajax/libs/angular-i18n/' + self.config['angular-i18n-version'] + '/angular-locale_' + name + extension);
        self.repository[REPOSITORY_ANGULAR_LOCALE] = output;

        return '';
    };

    /*
     Include: Controller into the head
     @name {String or String Array}
     return {String}
     */
    Controller.prototype.$ngController = function (name) {

        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngController(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngController(name[i]);
            return '';
        }

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var output = self.repository[REPOSITORY_ANGULAR_CONTROLLER] || '';
        var isLocal = name[0] === '~';

        if (isLocal)
            name = name.substring(1);

        output += self.$script_create('/controllers/' + name);
        self.repository[REPOSITORY_ANGULAR_CONTROLLER] = output;

        return '';
    };

    /*
     Include: Content from file into the body
     @name {String}
     return {String}
     */
    Controller.prototype.$ngTemplate = function (name, id) {

        var self = this;

        if (typeof(id) === consts.UNDEFINED)
            id = name;

        if (name.lastIndexOf('.html') === -1)
            name += '.html';

        if (name[0] === '~')
            name = name.substring(1);
        else if (name[1] !== '/')
            name = '/templates/' + name;

        var key = 'ng-' + name;
        var tmp = framework.temporary.views[key];

        if (typeof(tmp) === consts.UNDEFINED) {
            var filename = utils.combine(self.config['directory-angular'], name);

            if (fs.existsSync(filename))
                tmp = fs.readFileSync(filename).toString('utf8');
            else
                tmp = '';

            if (!self.isDebug)
                framework.temporary.views[key] = tmp;
        }

        return '<script type="text/ng-template" id="' + id + '">' + tmp + '</script>';
    };

    /*
     Include: Directive into the head
     @name {String}
     return {String}
     */
    Controller.prototype.$ngDirective = function (name) {

        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngDirective(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngDirective(name[i]);
            return '';
        }

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var output = self.repository[REPOSITORY_ANGULAR_OTHER] || '';
        var isLocal = name[0] === '~';

        if (isLocal)
            name = name.substring(1);

        output += self.$script_create('/directives/' + name);
        self.repository[REPOSITORY_ANGULAR_OTHER] = output;
        return '';
    };

    /*
     Include: CSS into the head
     @name {String}
     return {String}
     */
    Controller.prototype.$ngStyle = function (name) {

        var self = this;
        var length = arguments.length;

        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngStyle(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngStyle(name[i]);
            return '';
        }

        if (name.lastIndexOf('.css') === -1)
            name += '.css';

        self.head(name);
        return '';
    };

    /*
     Include: Service into the head
     @name {String}
     return {String}
     */
    Controller.prototype.$ngService = function (name) {

        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngService(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngService(name[i]);
            return '';
        }

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var output = self.repository[REPOSITORY_ANGULAR_OTHER] || '';
        var isLocal = name[0] === '~';

        if (isLocal)
            name = name.substring(1);

        output += self.$script_create('/services/' + name);
        self.repository[REPOSITORY_ANGULAR_OTHER] = output;

        return '';
    };

    /*
     Include: Filter into the head
     @name {String}
     return {String}
     */
    Controller.prototype.$ngFilter = function (name) {

        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngFilter(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngFilter(name[i]);
            return '';
        }

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var output = self.repository[REPOSITORY_ANGULAR_OTHER] || '';
        var isLocal = name[0] === '~';

        if (isLocal)
            name = name.substring(1);

        output += self.$script_create('/filters/' + name);
        self.repository[REPOSITORY_ANGULAR_OTHER] = output;

        return '';
    };

    /*
     Include: Resource into the head
     @name {String}
     return {String}
     */
    Controller.prototype.$ngResource = function (name) {

        var self = this;

        var length = arguments.length;
        if (length > 1) {
            for (var i = 0; i < length; i++)
                self.$ngResource(arguments[i]);
            return '';
        }

        if (name instanceof Array) {
            length = name.length;
            for (var i = 0; i < length; i++)
                self.$ngResource(name[i]);
            return '';
        }

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        var output = self.repository[REPOSITORY_ANGULAR_OTHER] || '';
        var isLocal = name[0] === '~';

        if (isLocal)
            name = name.substring(1);

        output += self.$script_create('/resources/' + name);
        self.repository[REPOSITORY_ANGULAR_OTHER] = output;

        return '';
    };

    Controller.prototype.$ngInclude = function (name) {
        var self = this;

        if (name.lastIndexOf(EXTENSION_JS) === -1)
            name += EXTENSION_JS;

        return self.$script_create(name);
    };
}