var consts = require('./consts');
var internal = require('./internal');
const ATTR_END = '"';

module.exports = function (Controller) {

    /*
     Internal function for views
     @name {String} :: filename
     @model {Object}
     return {String}
     */
    Controller.prototype.$view = function (name, model) {
        return this.$viewToggle(true, name, model);
    };

    /*
     Internal function for views
     @visible {Boolean}
     @name {String} :: filename
     @model {Object}
     return {String}
     */
    Controller.prototype.$viewToggle = function (visible, name, model) {
        if (!visible)
            return '';
        var self = this;
        var layout = self.layoutName;
        self.layoutName = '';
        var value = self.view(name, model, null, true);
        self.layoutName = layout;
        return value;
    };

    Controller.prototype.$script_create = function (url) {
        return '<script type="text/javascript" src="' + url + '"></script>';
    };

    /*
     Internal function for views
     @name {String} :: filename
     return {String}
     */
    Controller.prototype.$content = function (name) {
        return this.$contentToggle(true, name);
    };

    /*
     Internal function for views
     @visible {Boolean}
     @name {String} :: filename
     return {String}
     */
    Controller.prototype.$contentToggle = function (visible, name) {

        var self = this;

        if (!visible)
            return '';

        if (name[0] !== '~')
            name = self._currentContent + name;

        return internal.generateContent(self, name) || '';
    };

    Controller.prototype.$url = function (host) {
        var self = this;
        return host ? self.req.hostname(self.url) : self.url;
    };

    /*
     Internal function for views
     @name {String} :: filename
     @model {Object} :: must be an array
     @nameEmpty {String} :: optional filename from contents
     @repository {Object} :: optional
     return {Controller};
     */
    Controller.prototype.$template = function (name, model, nameEmpty, repository) {
        var self = this;
        return self.$templateToggle(true, name, model, nameEmpty, repository);
    };

    /*
     Internal function for views
     @bool {Boolean}
     @name {String} :: filename
     @model {Object}
     @nameEmpty {String} :: optional filename from contents
     @repository {Object} :: optional
     return {Controller};
     */
    Controller.prototype.$templateToggle = function (visible, name, model, nameEmpty, repository) {
        var self = this;

        if (!visible)
            return '';

        return self.template(name, model, nameEmpty, repository);
    };

    /*
     Internal function for views
     @name {String} :: filename
     @model {Object} :: must be an array
     @nameEmpty {String} :: optional filename from contents
     @repository {Object} :: optional
     return {Controller};
     */
    Controller.prototype.$component = function (name) {
        var self = this;
        return self.component.apply(self, arguments);
    };

    Controller.prototype.$helper = function (name) {
        var self = this;
        return self.helper.apply(self, arguments);
    };

    /*
     Internal function for views
     @bool {Boolean}
     @name {String} :: filename
     @model {Object}
     @nameEmpty {String} :: optional filename from contents
     @repository {Object} :: optional
     return {Controller};
     */
    Controller.prototype.$componentToggle = function (visible, name) {
        var self = this;

        if (!visible)
            return '';

        var params = [];
        var length = arguments.length;

        for (var i = 1; i < length; i++)
            params.push(arguments[i]);

        return self.component.apply(self, arguments);
    };

    /*
     Internal function for views
     @name {String}
     return {String}
     */
    Controller.prototype.$checked = function (bool, charBeg, charEnd) {
        var self = this;
        return self.$isValue(bool, charBeg, charEnd, 'checked="checked"');
    };

    /*
     Internal function for views
     @bool {Boolean}
     @charBeg {String}
     @charEnd {String}
     return {String}
     */
    Controller.prototype.$disabled = function (bool, charBeg, charEnd) {
        var self = this;
        return self.$isValue(bool, charBeg, charEnd, 'disabled="disabled"');
    };

    /*
     Internal function for views
     @bool {Boolean}
     @charBeg {String}
     @charEnd {String}
     return {String}
     */
    Controller.prototype.$selected = function (bool, charBeg, charEnd) {
        var self = this;
        return self.$isValue(bool, charBeg, charEnd, 'selected="selected"');
    };

    /**
     * Fake function for assign value
     * @private
     * @param {Object} value Value to eval.
     * return {String} Returns empty string.
     */
    Controller.prototype.$set = function (value) {
        return '';
    };

    /*
     Internal function for views
     @bool {Boolean}
     @charBeg {String}
     @charEnd {String}
     return {String}
     */
    Controller.prototype.$readonly = function (bool, charBeg, charEnd) {
        var self = this;
        return self.$isValue(bool, charBeg, charEnd, 'readonly="readonly"');
    };

    /*
     Internal function for views
     @name {String}
     @value {String}
     return {String}
     */
    Controller.prototype.$header = function (name, value) {
        this.header(name, value);
        return '';
    };

    /*
     Internal function for views
     @model {Object}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$text = function (model, name, attr) {
        return this.$input(model, 'text', name, attr);
    };

    /*
     Internal function for views
     @model {Object}
     @name {String} :: optional
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$password = function (model, name, attr) {
        return this.$input(model, 'password', name, attr);
    };

    /*
     Internal function for views
     @model {Object}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$hidden = function (model, name, attr) {
        return this.$input(model, 'hidden', name, attr);
    };

    /*
     Internal function for views
     @model {Object}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$radio = function (model, name, value, attr) {

        if (typeof(attr) === consts.STRING)
            attr = {
                label: attr
            };

        attr.value = value;
        return this.$input(model, 'radio', name, attr);
    };

    /*
     Internal function for views
     @model {Object}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$checkbox = function (model, name, attr) {

        if (typeof(attr) === consts.STRING)
            attr = {
                label: attr
            };

        return this.$input(model, 'checkbox', name, attr);
    };

    /*
     Internal function for views
     @model {Object}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$textarea = function (model, name, attr) {

        var builder = '<textarea';

        if (typeof(attr) !== consts.OBJECT)
            attr = {};

        builder += ' name="' + name + '" id="' + (attr.id || name) + ATTR_END;

        var keys = Object.keys(attr);
        var length = keys.length;

        for (var i = 0; i < length; i++) {

            switch (keys[i]) {
                case 'name':
                case 'id':
                    break;
                case 'required':
                case 'disabled':
                case 'readonly':
                case 'value':
                    builder += ' ' + keys[i] + '="' + keys[i] + ATTR_END;
                    break;
                default:
                    builder += ' ' + keys[i] + '="' + attr[keys[i]].toString().encode() + ATTR_END;
                    break;
            }
        }

        if (typeof(model) === consts.UNDEFINED)
            return builder + '></textarea>';

        var value = (model[name] || attr.value) || '';
        return builder + '>' + value.toString().encode() + '</textarea>';
    };

    /*
     Internal function for views
     @model {Object}
     @type {String}
     @name {String}
     @attr {Object} :: optional
     return {String}
     */
    Controller.prototype.$input = function (model, type, name, attr) {

        var builder = ['<input'];

        if (typeof(attr) !== consts.OBJECT)
            attr = {};

        var val = attr.value || '';

        builder += ' type="' + type + ATTR_END;

        if (type === 'radio')
            builder += ' name="' + name + ATTR_END;
        else
            builder += ' name="' + name + '" id="' + (attr.id || name) + ATTR_END;

        if (attr.autocomplete) {
            if (attr.autocomplete === true || attr.autocomplete === 'on')
                builder += ' autocomplete="on"';
            else
                builder += ' autocomplete="off"';
        }

        var keys = Object.keys(attr);
        var length = keys.length;

        for (var i = 0; i < length; i++) {

            switch (keys[i]) {
                case 'name':
                case 'id':
                case 'type':
                case 'autocomplete':
                case 'checked':
                case 'value':
                case 'label':
                    break;
                case 'required':
                case 'disabled':
                case 'readonly':
                case 'autofocus':
                    builder += ' ' + keys[i] + '="' + keys[i] + ATTR_END;
                    break;
                default:
                    builder += ' ' + keys[i] + '="' + attr[keys[i]].toString().encode() + ATTR_END;
                    break;
            }
        }

        var value = '';

        if (typeof(model) !== consts.UNDEFINED) {
            value = model[name];

            if (type === 'checkbox') {
                if (value === '1' || value === 'true' || value === true)
                    builder += ' checked="checked"';

                value = val || '1';
            }

            if (type === 'radio') {

                val = (val || '').toString();

                if (value.toString() === val)
                    builder += ' checked="checked"';

                value = val || '';
            }
        }

        if (typeof(value) !== consts.UNDEFINED)
            builder += ' value="' + (value || '').toString().encode() + ATTR_END;
        else
            builder += ' value="' + (attr.value || '').toString().encode() + ATTR_END;

        builder += ' />';

        if (attr.label)
            return '<label>' + builder + ' <span>' + attr.label + '</span></label>';

        return builder;
    };

    /*
     Internal function for views
     @arguments {String}
     return {String}
     */
    Controller.prototype.$dns = function (value) {

        var builder = '';
        var self = this;
        var length = arguments.length;

        for (var i = 0; i < length; i++)
            builder += '<link rel="dns-prefetch" href="' + self._prepareHost(arguments[i] || '') + '" />';

        self.head(builder);
        return '';
    };


    /*
     Internal function for views
     @arguments {String}
     return {String}
     */
    Controller.prototype.$prefetch = function () {

        var builder = '';
        var self = this;
        var length = arguments.length;

        for (var i = 0; i < length; i++)
            builder += '<link rel="prefetch" href="' + self._prepareHost(arguments[i] || '') + '" />';

        self.head(builder);
        return '';
    };

    /*
     Internal function for views
     @arguments {String}
     return {String}
     */
    Controller.prototype.$prerender = function (value) {

        var builder = '';
        var self = this;
        var length = arguments.length;

        for (var i = 0; i < length; i++)
            builder += '<link rel="prerender" href="' + self._prepareHost(arguments[i] || '') + '" />';

        self.head(builder);
        return '';
    };

    /*
     Internal function for views
     @value {String}
     return {String}
     */
    Controller.prototype.$next = function (value) {
        var self = this;
        self.head('<link rel="next" href="' + self._prepareHost(value || '') + '" />');
        return '';
    };

    /*
     Internal function for views
     @arguments {String}
     return {String}
     */
    Controller.prototype.$prev = function (value) {
        var self = this;
        self.head('<link rel="prev" href="' + self._prepareHost(value || '') + '" />');
        return '';
    };

    /*
     Internal function for views
     @arguments {String}
     return {String}
     */
    Controller.prototype.$canonical = function (value) {
        var self = this;
        self.head('<link rel="canonical" href="' + self._prepareHost(value || '') + '" />');
        return '';
    };


    /*
     Render template to string
     @name {String} :: filename
     @model {Object}
     @nameEmpty {String} :: filename for empty Contents
     @repository {Object}
     @cb {Function} :: callback(string)
     return {String}
     */
    Controller.prototype.template = function (name, model, nameEmpty, repository) {

        var self = this;

        if (typeof(nameEmpty) === consts.OBJECT) {
            repository = nameEmpty;
            nameEmpty = '';
        }

        if (typeof(model) === consts.UNDEFINED || model === null || model.length === 0) {

            if (typeof(nameEmpty) !== consts.UNDEFINED && nameEmpty.length > 0)
                return self.$content(nameEmpty);

            return '';
        }

        if (typeof(repository) === consts.UNDEFINED)
            repository = self.repository;

        var plus = '';

        if (name[0] !== '~')
            plus = self._currentTemplate;

        try {
            return internal.generateTemplate(self, name, model, repository, plus);
        } catch (ex) {
            self.error(new Error('Template: ' + name + ' - ' + ex.toString()));
            return '';
        }
    };

    /*
     Render component to string
     @name {String}
     return {String}
     */
    Controller.prototype.component = function (name) {
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
    Controller.prototype.helper = function (name) {
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
     Internal function for views
     @arr {Array} :: array of object or plain value array
     @selected {Object} :: value for selecting item
     @name {String} :: name of name property, default: name
     @value {String} :: name of value property, default: value
     return {String}
     */
    Controller.prototype.$options = function (arr, selected, name, value) {

        var self = this;
        var type = typeof(arr);

        if (arr === null || typeof(arr) === consts.UNDEFINED)
            return '';

        var isObject = false;
        var tmp = null;

        if (!(arr instanceof Array) && type === consts.OBJECT) {
            isObject = true;
            tmp = arr;
            arr = Object.keys(arr);
        }

        if (!utils.isArray(arr))
            arr = [arr];

        selected = selected || '';

        var options = '';

        if (!isObject) {
            if (typeof(value) === consts.UNDEFINED)
                value = value || name || 'value';

            if (typeof(name) === consts.UNDEFINED)
                name = name || 'name';
        }

        var isSelected = false;
        var length = 0;

        length = arr.length;

        for (var i = 0; i < length; i++) {

            var o = arr[i];
            var type = typeof(o);
            var text = '';
            var val = '';
            var sel = false;

            if (isObject) {
                if (name === true) {
                    val = tmp[o];
                    text = o;
                    if (value === null)
                        value = '';
                } else {
                    val = o;
                    text = tmp[o];
                    if (text === null)
                        text = '';
                }

            } else if (type === consts.OBJECT) {

                text = (o[name] || '');
                val = (o[value] || '');

                if (typeof(text) === consts.FUNCTION)
                    text = text(i);

                if (typeof(val) === consts.FUNCTION)
                    val = val(i, text);

            } else {
                text = o;
                val = o;
            }

            if (!isSelected) {
                sel = val == selected;
                isSelected = sel;
            }

            options += '<option value="' + val.toString().encode() + '"' + (sel ? ' selected="selected"' : '') + '>' + text.toString().encode() + '</option>';
        }

        return options;
    };

    /*
     Append <script> TAG
     @name {String} :: filename
     return {String}
     */
    Controller.prototype.$script = function (name) {
        return this.routeJS(name, true);
    };

    Controller.prototype.$js = function (name) {
        return this.routeJS(name, true);
    };

    /*
     Appedn style <link> TAG
     @name {String} :: filename
     return {String}
     */
    Controller.prototype.$css = function (name) {
        return this.routeCSS(name, true);
    };

    /*
     Append <img> TAG
     @name {String} :: filename
     @width {Number} :: optional
     @height {Number} :: optional
     @alt {String} :: optional
     @className {String} :: optional
     return {String}
     */
    Controller.prototype.$image = function (name, width, height, alt, className) {

        var style = '';

        if (typeof(width) === consts.OBJECT) {
            height = width.height;
            alt = width.alt;
            className = width.class;
            style = width.style;
            width = width.width;
        }

        var builder = '<img src="' + this.routeImage(name) + ATTR_END;

        if (width > 0)
            builder += ' width="' + width + ATTR_END;

        if (height > 0)
            builder += ' height="' + height + ATTR_END;

        if (alt)
            builder += ' alt="' + alt.encode() + ATTR_END;

        if (className)
            builder += ' class="' + className + ATTR_END;

        if (style)
            builder += ' style="' + style + ATTR_END;

        return builder + ' border="0" />';
    };

    /*
     Append <a> TAG
     @filename {String}
     @innerHTML {String}
     @downloadName {String}
     @className {String} :: optional
     return {String}
     */
    Controller.prototype.$download = function (filename, innerHTML, downloadName, className) {
        var builder = '<a href="' + framework.routeDownload(filename) + ATTR_END;

        if (downloadName)
            builder += ' download="' + downloadName + ATTR_END;

        if (className)
            builder += ' class="' + className + ATTR_END;

        return builder + '>' + (innerHTML || filename) + '</a>';
    };

    Controller.prototype.$json = function (obj, name, beautify) {

        if (typeof(name) === consts.BOOLEAN) {
            var tmp = name;
            name = beautify;
            beautify = name;
        }

        var value = beautify ? JSON.stringify(obj, null, 4) : JSON.stringify(obj);

        if (!name)
            return value;

        return '<script type="application/json" id="' + name + '">' + value + '</script>';
    };

    /*
     Append favicon TAG
     @name {String} :: filename
     return {String}
     */
    Controller.prototype.$favicon = function (name) {
        var self = this;
        var contentType = 'image/x-icon';

        if (typeof(name) === consts.UNDEFINED)
            name = 'favicon.ico';

        if (name.lastIndexOf('.png') !== -1)
            contentType = 'image/png';

        if (name.lastIndexOf('.gif') !== -1)
            contentType = 'image/gif';

        name = framework.routeStatic('/' + name);

        return '<link rel="shortcut icon" href="' + name + '" type="' + contentType + '" /><link rel="icon" href="' + name + '" type="' + contentType + '" />';
    };


};
