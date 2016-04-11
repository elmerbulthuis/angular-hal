(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.angularHal = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * content-type
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
var paramRegExp = /; *([!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+) */g
var textRegExp = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/
var tokenRegExp = /^[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+$/

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
var qescRegExp = /\\([\u000b\u0020-\u00ff])/g

/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */
var quoteRegExp = /([\\"])/g

/**
 * RegExp to match type in RFC 6838
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
var typeRegExp = /^[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+\/[!#$%&'\*\+\-\.\^_`\|~0-9A-Za-z]+$/

/**
 * Module exports.
 * @public
 */

exports.format = format
exports.parse = parse

/**
 * Format object to media type.
 *
 * @param {object} obj
 * @return {string}
 * @public
 */

function format(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('argument obj is required')
  }

  var parameters = obj.parameters
  var type = obj.type

  if (!type || !typeRegExp.test(type)) {
    throw new TypeError('invalid type')
  }

  var string = type

  // append parameters
  if (parameters && typeof parameters === 'object') {
    var param
    var params = Object.keys(parameters).sort()

    for (var i = 0; i < params.length; i++) {
      param = params[i]

      if (!tokenRegExp.test(param)) {
        throw new TypeError('invalid parameter name')
      }

      string += '; ' + param + '=' + qstring(parameters[param])
    }
  }

  return string
}

/**
 * Parse media type to object.
 *
 * @param {string|object} string
 * @return {Object}
 * @public
 */

function parse(string) {
  if (!string) {
    throw new TypeError('argument string is required')
  }

  if (typeof string === 'object') {
    // support req/res-like objects as argument
    string = getcontenttype(string)

    if (typeof string !== 'string') {
      throw new TypeError('content-type header is missing from object');
    }
  }

  if (typeof string !== 'string') {
    throw new TypeError('argument string is required to be a string')
  }

  var index = string.indexOf(';')
  var type = index !== -1
    ? string.substr(0, index).trim()
    : string.trim()

  if (!typeRegExp.test(type)) {
    throw new TypeError('invalid media type')
  }

  var key
  var match
  var obj = new ContentType(type.toLowerCase())
  var value

  paramRegExp.lastIndex = index

  while (match = paramRegExp.exec(string)) {
    if (match.index !== index) {
      throw new TypeError('invalid parameter format')
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value
        .substr(1, value.length - 2)
        .replace(qescRegExp, '$1')
    }

    obj.parameters[key] = value
  }

  if (index !== -1 && index !== string.length) {
    throw new TypeError('invalid parameter format')
  }

  return obj
}

/**
 * Get content-type from req/res objects.
 *
 * @param {object}
 * @return {Object}
 * @private
 */

function getcontenttype(obj) {
  if (typeof obj.getHeader === 'function') {
    // res-like
    return obj.getHeader('content-type')
  }

  if (typeof obj.headers === 'object') {
    // req-like
    return obj.headers && obj.headers['content-type']
  }
}

/**
 * Quote a string if necessary.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function qstring(val) {
  var str = String(val)

  // no need to quote tokens
  if (tokenRegExp.test(str)) {
    return str
  }

  if (str.length > 0 && !textRegExp.test(str)) {
    throw new TypeError('invalid parameter value')
  }

  return '"' + str.replace(quoteRegExp, '\\$1') + '"'
}

/**
 * Class to represent a content type.
 * @private
 */
function ContentType(type) {
  this.parameters = Object.create(null)
  this.type = type
}

},{}],2:[function(require,module,exports){
/* jshint node:true */

var UriTemplate = require('./UriTemplate');

function Router() {
    var routes = [];

    this.add = function (template, handler) {

        routes.push({
            template: new UriTemplate(template),
            handler: handler
        }); //

    }; //add

    this.handle = function (url) {

        return routes.some(function (route) {
            var data = route.template.parse(url);
            return data && route.handler(data) !== false;
        });

    }; //exec

} //Router

module.exports = Router;
},{"./UriTemplate":3}],3:[function(require,module,exports){
/* jshint node:true */

module.exports = UriTemplate;


var operatorOptions = {
    "": {
        "prefix": "",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": percentEncode
    },
    "+": {
        "prefix": "",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": encodeURI
    },
    "#": {
        "prefix": "#",
        "seperator": ",",
        "assignment": false,
        "assignEmpty": false,
        "encode": encodeURI
    },
    ".": {
        "prefix": ".",
        "seperator": ".",
        "assignment": false,
        "assignEmpty": false,
        "encode": percentEncode
    },
    "/": {
        "prefix": "/",
        "seperator": "/",
        "assignment": false,
        "encode": encodeURIComponent
    },
    ";": {
        "prefix": ";",
        "seperator": ";",
        "assignment": true,
        "assignEmpty": false,
        "encode": encodeURIComponent
    },
    "?": {
        "prefix": "?",
        "seperator": "&",
        "assignment": true,
        "assignEmpty": true,
        "encode": encodeURIComponent
    },
    "&": {
        "prefix": "&",
        "seperator": "&",
        "assignment": true,
        "assignEmpty": true,
        "encode": encodeURIComponent
    }
}; //operatorOptions

function percentEncode(value) {
    /*
	http://tools.ietf.org/html/rfc3986#section-2.3
	*/
    var unreserved = "-._~";

    if (isUndefined(value)) return '';

    value = value.toString();

    return Array.prototype.map.call(value, function (ch) {
        var charCode = ch.charCodeAt(0);

        if (charCode >= 0x30 && charCode <= 0x39) return ch;
        if (charCode >= 0x41 && charCode <= 0x5a) return ch;
        if (charCode >= 0x61 && charCode <= 0x7a) return ch;

        if (~unreserved.indexOf(ch)) return ch;

        return '%' + charCode.toString(16).toUpperCase();
    }).join('');

} //percentEncode

function isDefined(value) {
    return !isUndefined(value);
} //isDefined
function isUndefined(value) {
    /*
	http://tools.ietf.org/html/rfc6570#section-2.3
	*/
    if (value === null) return true;
    if (value === undefined) return true;
    if (Array.isArray(value)) {
        if (value.length === 0) return true;
    }

    return false;
} //isUndefined


function UriTemplate(template) {
    /*
	http://tools.ietf.org/html/rfc6570#section-2.2

	expression    =  "{" [ operator ] variable-list "}"
	operator      =  op-level2 / op-level3 / op-reserve
	op-level2     =  "+" / "#"
	op-level3     =  "." / "/" / ";" / "?" / "&"
	op-reserve    =  "=" / "," / "!" / "@" / "|"
	*/
    var reTemplate = /\{([\+#\.\/;\?&=\,!@\|]?)([A-Za-z0-9_\,\.\:\*]+?)\}/g;
    var reVariable = /^([\$_a-z][\$_a-z0-9]*)((?:\:[1-9][0-9]?[0-9]?[0-9]?)?)(\*?)$/i;
    var match;
    var pieces = [];
    var glues = [];
    var offset = 0;
    var pieceCount = 0;

    while ( !! (match = reTemplate.exec(template))) {
        glues.push(template.substring(offset, match.index));
        /*
		The operator characters equals ("="), comma (","), exclamation ("!"),
		at sign ("@"), and pipe ("|") are reserved for future extensions.
		*/
        if (match[1] && ~'=,!@|'.indexOf(match[1])) {
            throw "operator '" + match[1] + "' is reserved for future extensions";
        }

        offset = match.index;
        pieces.push({
            operator: match[1],
            variables: match[2].split(',').map(variableMapper)
        });
        offset += match[0].length;
        pieceCount++;
    }

    function variableMapper(variable) {
        var match = reVariable.exec(variable);
        return {
            name: match[1],
            maxLength: match[2] && parseInt(match[2].substring(1), 10),
            composite: !! match[3]
        };
    }

    glues.push(template.substring(offset));

    this.parse = function (str) {
        var data = {};
        var offset = 0;
        var offsets = [];

        if (!glues.every(function (glue, glueIndex) {
            var index;
            if (glueIndex > 0 && glue === '') index = str.length;
            else index = str.indexOf(glue, offset);

            offset = index;
            offsets.push(offset);
            offset += glue.length;

            return~ index;
        })) return false;

        if (!pieces.every(function (piece, pieceIndex) {
            var options = operatorOptions[piece.operator];
            var value, values;
            var offsetBegin = offsets[pieceIndex] + glues[pieceIndex].length;
            var offsetEnd = offsets[pieceIndex + 1];

            value = str.substring(offsetBegin, offsetEnd);
            if (value.length === 0) return true;
            if (value.substring(0, options.prefix.length) !== options.prefix) return false;
            value = value.substring(options.prefix.length);
            values = value.split(options.seperator);

            if (!piece.variables.every(function (variable, variableIndex) {
                var value = values[variableIndex];
                var name;

                if (value === undefined) return true;

                name = variable.name;

                if (options.assignment) {
                    if (value.substring(0, name.length) !== name) return false;
                    value = value.substring(name.length);
                    if (value.length === 0 && options.assignEmpty) return false;
                    if (value.length > 0) {
                        if (value[0] !== '=') return false;
                        value = value.substring(1);
                    }
                }
                value = decodeURIComponent(value);
                data[name] = value;

                return true;
            })) return false;

            return true;

        })) return false;

        return data;
    }; //parse

    this.stringify = function (data) {
        var str = '';
        data = data || {};

        str += glues[0];
        if (!pieces.every(function (piece, pieceIndex) {

            var options = operatorOptions[piece.operator];
            var parts;

            parts = piece.variables.map(function (variable) {
                var value = data[variable.name];

                if (!Array.isArray(value)) value = [value];

                value = value.filter(isDefined);

                if (isUndefined(value)) return null;

                if (variable.composite) {
                    value = value.map(function (value) {

                        if (typeof value === 'object') {

                            value = Object.keys(value).map(function (key) {
                                var keyValue = value[key];
                                if (variable.maxLength) keyValue = keyValue.substring(0, variable.maxLength);

                                keyValue = options.encode(keyValue);

                                if (keyValue) keyValue = key + '=' + keyValue;
                                else {
                                    keyValue = key;
                                    if (options.assignEmpty) keyValue += '=';
                                }

                                return keyValue;
                            }).join(options.seperator);

                        } else {
                            if (variable.maxLength) value = value.substring(0, variable.maxLength);

                            value = options.encode(value);

                            if (options.assignment) {
                                if (value) value = variable.name + '=' + value;
                                else {
                                    value = variable.name;
                                    if (options.assignEmpty) value += '=';
                                }
                            }
                        }

                        return value;
                    });

                    value = value.join(options.seperator);
                } else {
                    value = value.map(function (value) {
                        if (typeof value === 'object') {
                            return Object.keys(value).map(function (key) {
                                var keyValue = value[key];
                                if (variable.maxLength) keyValue = keyValue.substring(0, variable.maxLength);
                                return key + ',' + options.encode(keyValue);
                            }).join(',');
                        } else {
                            if (variable.maxLength) value = value.substring(0, variable.maxLength);

                            return options.encode(value);
                        }

                    });
                    value = value.join(',');

                    if (options.assignment) {
                        if (value) value = variable.name + '=' + value;
                        else {
                            value = variable.name;
                            if (options.assignEmpty) value += '=';
                        }
                    }

                }

                return value;
            });

            parts = parts.filter(isDefined);
            if (isDefined(parts)) {
                str += options.prefix;
                str += parts.join(options.seperator);
            }

            str += glues[pieceIndex + 1];
            return true;
        })) return false;

        return str;
    }; //stringify

} //UriTemplate
},{}],4:[function(require,module,exports){
/* jshint node:true */

module.exports = {
    Router: require('./Router'),
    UriTemplate: require('./UriTemplate')
};
},{"./Router":2,"./UriTemplate":3}],5:[function(require,module,exports){
"use strict";function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(exports,"__esModule",{value:!0});var _createClass=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),HalClient=function(){function e(t,n,r,u){_classCallCheck(this,e),this._$log=t,this._$http=n,this._$halConfiguration=u,this.LinkHeader=r}return _createClass(e,[{key:"$get",value:function(e,t){return this.$request("GET",e,t)}},{key:"$post",value:function(e,t,n){return this.$request("POST",e,t,n)}},{key:"$put",value:function(e,t,n){return this.$request("PUT",e,t,n)}},{key:"$patch",value:function(e,t,n){return this.$request("PATCH",e,t,n)}},{key:"$delete",value:function(e,t){return this.$request("DELETE",e,t)}},{key:"$link",value:function(e,t,n){return t=t||{},t.headers=t.headers||{},t.headers.Link=n.map(function(e){return e.toString()}),this.$request("LINK",e,t)}},{key:"$unlink",value:function(e,t,n){return t=t||{},t.headers=t.headers||{},t.headers.Link=n.map(function(e){return e.toString()}),this.$request("UNLINK",e,t)}},{key:"$request",value:function(e,t,n,r){return n=n||{},this._$log.log("The halClient service is deprecated. Please use $http directly instead."),this._$http(angular.extend({},n,{method:e,url:this._$halConfiguration.urlTransformer(t),data:r}))}}]),e}();exports["default"]=HalClient;

},{}],6:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _halClient=require("./hal-client"),_halClient2=_interopRequireDefault(_halClient),_linkHeader=require("./link-header"),_linkHeader2=_interopRequireDefault(_linkHeader),MODULE_NAME="angular-hal.client";angular.module(MODULE_NAME,[]).service("halClient",_halClient2["default"]).service("$halClient",_halClient2["default"]).value("LinkHeader",_linkHeader2["default"]),exports["default"]=MODULE_NAME;

},{"./hal-client":5,"./link-header":7}],7:[function(require,module,exports){
"use strict";function _classCallCheck(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(exports,"__esModule",{value:!0});var _createClass=function(){function e(e,n){for(var r=0;r<n.length;r++){var l=n[r];l.enumerable=l.enumerable||!1,l.configurable=!0,"value"in l&&(l.writable=!0),Object.defineProperty(e,l.key,l)}}return function(n,r,l){return r&&e(n.prototype,r),l&&e(n,l),n}}(),LinkHeader=function(){function e(n,r){_classCallCheck(this,e),this.uriReference=n,this.linkParams=angular.extend({rel:null,anchor:null,rev:null,hreflang:null,media:null,title:null,type:null},r)}return _createClass(e,[{key:"toString",value:function(){var e="<"+this.uriReference+">",n=[];for(var r in this.linkParams){var l=this.linkParams[r];l&&n.push(r+'="'+l+'"')}return n.length<1?e:e=e+";"+n.join(";")}}]),e}();exports["default"]=LinkHeader;

},{}],8:[function(require,module,exports){
"use strict";function _classCallCheck(e,r){if(!(e instanceof r))throw new TypeError("Cannot call a class as a function")}function noopUrlTransformer(e){return e}Object.defineProperty(exports,"__esModule",{value:!0});var _createClass=function(){function e(e,r){for(var t=0;t<r.length;t++){var i=r[t];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}return function(r,t,i){return t&&e(r.prototype,t),i&&e(r,i),r}}();exports.noopUrlTransformer=noopUrlTransformer;var HalConfigurationProvider=function(){function e(){_classCallCheck(this,e),this._linksAttribute="_links",this._embeddedAttribute="_embedded",this._ignoreAttributePrefixes=["_","$"],this._selfLink="self",this._forceJSONResource=!1,this._urlTransformer=noopUrlTransformer}return _createClass(e,[{key:"setLinksAttribute",value:function(e){this._linksAttribute=e}},{key:"setEmbeddedAttribute",value:function(e){this._embeddedAttribute=e}},{key:"setIgnoreAttributePrefixes",value:function(e){this._ignoreAttributePrefixes=e}},{key:"addIgnoreAttributePrefix",value:function(e){this._ignoreAttributePrefixes.push(e)}},{key:"setSelfLink",value:function(e){this._selfLink=e}},{key:"setForceJSONResource",value:function(e){this._forceJSONResource=e}},{key:"setUrlTransformer",value:function(e){this._urlTransformer=e}},{key:"$get",value:function(e){return this._urlTransformer!==noopUrlTransformer&&e.log("$halConfigurationProvider.setUrlTransformer is deprecated. Please write a http interceptor instead."),Object.freeze({linksAttribute:this._linksAttribute,embeddedAttribute:this._embeddedAttribute,ignoreAttributePrefixes:this._ignoreAttributePrefixes,selfLink:this._selfLink,forceJSONResource:this._forceJSONResource,urlTransformer:this._urlTransformer})}}]),e}();exports["default"]=HalConfigurationProvider;

},{}],9:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _halConfiguration=require("./hal-configuration.provider"),_halConfiguration2=_interopRequireDefault(_halConfiguration),MODULE_NAME="angular-hal.configuration";angular.module(MODULE_NAME,[]).provider("$halConfiguration",_halConfiguration2["default"]),exports["default"]=MODULE_NAME;

},{"./hal-configuration.provider":8}],10:[function(require,module,exports){
"use strict";function HttpInterceptorConfiguration(t){t.interceptors.push("ResourceHttpInterceptor")}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=HttpInterceptorConfiguration;

},{}],11:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _resource=require("../resource"),_resource2=_interopRequireDefault(_resource),_configuration=require("../configuration"),_configuration2=_interopRequireDefault(_configuration),_resourceHttpInterceptor=require("./resource-http-interceptor.factory"),_resourceHttpInterceptor2=_interopRequireDefault(_resourceHttpInterceptor),_httpInterception=require("./http-interception.config"),_httpInterception2=_interopRequireDefault(_httpInterception),MODULE_NAME="angular-hal.http-interception";angular.module(MODULE_NAME,[_resource2["default"],_configuration2["default"]]).config(_httpInterception2["default"]).factory("ResourceHttpInterceptor",_resourceHttpInterceptor2["default"]),exports["default"]=MODULE_NAME;

},{"../configuration":9,"../resource":16,"./http-interception.config":10,"./resource-http-interceptor.factory":12}],12:[function(require,module,exports){
"use strict";function ResourceHttpInterceptorFactory(e,t){function r(e){return"undefined"==typeof e.headers.Accept?e.headers.Accept=CONTENT_TYPE:e.headers.Accept=[CONTENT_TYPE,e.headers.Accept].join(", "),e}function n(t){try{if((0,_contentType.parse)(t.headers("Content-Type")).type===CONTENT_TYPE)return c(t)}catch(r){}return t.config.forceHal?c(t):"application/json"!==t.headers("Content-Type")&&null!==t.headers("Content-Type")||!e.forceJSONResource?t:c(t)}function c(e){return new t(e.data,e)}return{request:r,response:n}}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=ResourceHttpInterceptorFactory;var _contentType=require("content-type"),CONTENT_TYPE="application/hal+json";

},{"content-type":1}],13:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _httpInterception=require("./http-interception"),_httpInterception2=_interopRequireDefault(_httpInterception),_client=require("./client"),_client2=_interopRequireDefault(_client),MODULE_NAME="angular-hal";angular.module(MODULE_NAME,[_httpInterception2["default"],_client2["default"]]),exports["default"]=MODULE_NAME;

},{"./client":6,"./http-interception":11}],14:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}function generateUrl(e,r){return new _main2["default"].UriTemplate(e).stringify(r)}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=generateUrl;var _main=require("rfc6570/src/main"),_main2=_interopRequireDefault(_main);

},{"rfc6570/src/main":4}],15:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}function HalResourceClientFactory(e,r,n){function t(t,u){function a(r,a,i,d,l){var o;if(r=r||"GET",a=a||n.selfLink,i=i||{},d=d||null,l=l||{},"GET"===r&&a===n.selfLink)return e.resolve(t);if(t.$hasEmbedded(a)&&Array.isArray(u[a])){o=[];for(var s=0;s<u[a].length;s++)o.push(u[a][s].$request().$request(r,"self",i,d,l));return e.all(o)}if(t.$hasEmbedded(a))return u[a].$request().$request(r,"self",i,d,l);if(t.$hasLink(a)){var f=t.$href(a,i);if(angular.extend(l,{method:r,data:d}),Array.isArray(f)){o=[];for(var c=0;c<f.length;c++)o.push(p(angular.extend({},l,{url:f[c]})));return e.all(o)}return p(angular.extend({},l,{url:t.$href(a,i)}))}return e.reject(new Error('link "'+a+'" is undefined'))}function i(e,r,n){return a("GET",e,r,void 0,n)}function d(e,r,n,t){return a("POST",e,r,n,t)}function l(e,r,n,t){return a("PUT",e,r,n,t)}function o(e,r,n,t){return a("PATCH",e,r,n,t)}function s(e,r,n){return a("DELETE",e,r,void 0,n)}function f(e,r,n,t){return t=t||{},t.headers=t.headers||{},t.headers.Link=n.map(h),a("LINK",e,r,void 0,t)}function c(e,r,n,t){return t=t||{},t.headers=t.headers||{},t.headers.Link=n.map(h),a("UNLINK",e,r,void 0,t)}function h(e){return e.toString()}var $=this,p=r.get("$http");!function(){(0,_extendReadOnly2["default"])($,{$request:a,$get:i,$post:d,$put:l,$patch:o,$delete:s,$del:s,$link:f,$unlink:c})}()}return t}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=HalResourceClientFactory;var _extendReadOnly=require("../utility/extend-read-only"),_extendReadOnly2=_interopRequireDefault(_extendReadOnly);

},{"../utility/extend-read-only":19}],16:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _configuration=require("../configuration"),_configuration2=_interopRequireDefault(_configuration),_resource=require("./resource.factory"),_resource2=_interopRequireDefault(_resource),_halResourceClient=require("./hal-resource-client.factory"),_halResourceClient2=_interopRequireDefault(_halResourceClient),MODULE_NAME="angular-hal.resource";angular.module(MODULE_NAME,[_configuration2["default"]]).factory("Resource",_resource2["default"]).factory("HalResourceClient",_halResourceClient2["default"]),exports["default"]=MODULE_NAME;

},{"../configuration":9,"./hal-resource-client.factory":15,"./resource.factory":17}],17:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}function ResourceFactory(e,t){function r(n,i){function u(){for(var e in n)n.hasOwnProperty(e)&&(l(e)||(0,_defineReadOnly2["default"])(k,e,n[e]))}function o(){"object"===_typeof(n[t.linksAttribute])&&Object.keys(n[t.linksAttribute]).forEach(function(e){var r=n[t.linksAttribute][e];v[e]=(0,_normalizeLink2["default"])(i.config.url,r)})}function f(){"object"===_typeof(n[t.embeddedAttribute])&&Object.keys(n[t.embeddedAttribute]).forEach(function(e){d(e,n[t.embeddedAttribute][e])})}function a(){A=new e(k,R)}function d(e,t){return Array.isArray(t)?(R[e]=[],void t.forEach(function(t){R[e].push(new r(t,i))})):void(R[e]=new r(t,i))}function l(e){for(var r=0;r<t.ignoreAttributePrefixes.length;r++){if(e.substr(0,1)===t.ignoreAttributePrefixes[r])return!0;if(e===t.linksAttribute||e===t.embeddedAttribute)return!0}return!1}function y(e){return"undefined"!=typeof v[e]}function c(e){return"undefined"!=typeof R[e]}function s(e){return y(e)||c(e)}function b(e,r){if(!y(e))throw new Error('link "'+e+'" is undefined');var n=v[e],i=n.href;if(Array.isArray(n)){i=[];for(var u=0;u<n.length;u++){var o=n[u],f=o.href;"undefined"!=typeof o.templated&&o.templated&&(f=(0,_generateUrl2["default"])(o.href,r)),f=t.urlTransformer(f),i.push(f)}}else"undefined"!=typeof n.templated&&n.templated&&(i=(0,_generateUrl2["default"])(n.href,r)),i=t.urlTransformer(i);return i}function p(e){if(!y(e))throw new Error('link "'+e+'" is undefined');var t=v[e];return t}function _(e){for(var r=0;r<t.ignoreAttributePrefixes.length;r++){var i=t.ignoreAttributePrefixes[r]+e;return n[i]}}function m(){return i}function h(){return A}var A,k=this,v={},R={};!function(){"object"===("undefined"==typeof n?"undefined":_typeof(n))&&null!==n||(n={}),u(),f(),o(),a(),(0,_extendReadOnly2["default"])(k,{$hasLink:y,$hasEmbedded:c,$has:s,$href:b,$meta:_,$link:p,$request:h,$response:m})}()}return r}Object.defineProperty(exports,"__esModule",{value:!0});var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol?"symbol":typeof e};exports["default"]=ResourceFactory;var _extendReadOnly=require("../utility/extend-read-only"),_extendReadOnly2=_interopRequireDefault(_extendReadOnly),_defineReadOnly=require("../utility/define-read-only"),_defineReadOnly2=_interopRequireDefault(_defineReadOnly),_generateUrl=require("./generate-url"),_generateUrl2=_interopRequireDefault(_generateUrl),_normalizeLink=require("../utility/normalize-link"),_normalizeLink2=_interopRequireDefault(_normalizeLink);

},{"../utility/define-read-only":18,"../utility/extend-read-only":19,"../utility/normalize-link":20,"./generate-url":14}],18:[function(require,module,exports){
"use strict";function defineReadOnly(e,t,n){Object.defineProperty(e,t,{configurable:!1,enumerable:!0,value:n,writable:!0})}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=defineReadOnly;

},{}],19:[function(require,module,exports){
"use strict";function extendReadOnly(e,t){for(var n in t)Object.defineProperty(e,n,{configurable:!1,enumerable:!1,value:t[n]})}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=extendReadOnly;

},{}],20:[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}function normalizeLink(e,r){return Array.isArray(r)?r.map(function(r){return normalizeLink(e,r)}):"string"==typeof r?{href:(0,_resolveUrl2["default"])(e,r)}:"string"==typeof r.href?(r.href=(0,_resolveUrl2["default"])(e,r.href),r):Array.isArray(r.href)?r.href.map(function(t){var l=angular.extend({},r,{href:t});return normalizeLink(e,l)}):{href:e}}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=normalizeLink;var _resolveUrl=require("../utility/resolve-url"),_resolveUrl2=_interopRequireDefault(_resolveUrl);

},{"../utility/resolve-url":21}],21:[function(require,module,exports){
"use strict";function resolveUrl(e,r){for(var t="",o=/^((?:\w+\:)?)((?:\/\/)?)([^\/]*)((?:\/.*)?)$/,l=o.exec(e),s=o.exec(r),u=1;5>u;u++)t+=s[u]?s[u]:l[u];return t}Object.defineProperty(exports,"__esModule",{value:!0}),exports["default"]=resolveUrl;

},{}]},{},[13])(13)
});