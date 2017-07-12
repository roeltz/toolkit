(function(r, f){
	 if (typeof define == "function" && define.amd) {
		define(f);
	} else if (typeof exports == "object") {
		module.exports = f();
	} else {
		r.roeltz = f();
	}
})(this, function(){

	var exports;

	var slice = Array.prototype.slice;

	//

	function self(object) {
		return object;
	}

	// Type-checking

	function isArray(object){
		return Array.isArray ? Array.isArray(object) : object instanceof Array;
	}

	function isBoolean(object){
		return typeof object == "boolean" || object instanceof Boolean;
	}

	function isDate(object){
		return object instanceof Date;
	}

	function isFunction(object){
		return typeof object == "function" || object instanceof Function;
	}

	function isIterable(object){
		return isArray(object) || (isSomething(object) && isNumber(object.length) && !isString(object));
	}

	function isNothing(object) {
		return isNull(object) || isUndefined(object);
	}

	function isNull(object) {
		return object === null;
	}

	function isNumber(object){
		return typeof object == "number" || object instanceof Number && !isNaN(object) && isFinite(object);
	}

	function isNumericString(object){
		return isNumber(parseFloat(object));
	}

	function isObject(object, plain) {
		if (plain && object && object.constructor
					&& !Object.prototype.hasOwnProperty.call(object, "constructor")
					&& !Object.prototype.hasOwnProperty.call(object.constructor.prototype, "isPrototypeOf") ) {
					return false;
		}
		return object && !(isScalar(object) || isArray(object) || isDate(object) || isFunction(object) || isRegExp(object));
	}

	function isRegExp(object) {
		return object instanceof RegExp;
	}

	function isScalar(object){
		return isString(object) || isNumber(object) || isBoolean(object);
	}

	function isSomething(object){
		return !isNull(object) && !isUndefined(object);
	}

	function isString(object){
		return typeof object == "string" || object instanceof String;
	}

	function isUndefined(object) {
		return object === undefined;
	}

	function isWhat(object) {
		if (isArray(object)) return "array";
		if (isBoolean(object)) return "boolean";
		if (isDate(object)) return "date";
		if (isFunction(object)) return "function";
		if (isNull(object)) return "null";
		if (isNumber(object)) return "number";
		if (isObject(object)) return "object";
		if (isRegExp(object)) return "regexp";
		if (isString(object)) return "string";
		if (isUndefined(object)) return "undefined";
		if (isIterable(object)) return "iterable";
		return "unknown";
	}

	// Object helpers

	function clone(object) {
		return deepCopy({}, object);
	}

	function copy(destination, source) {
		each(source, function(value, k){
			destination[k] = value;
		});
		return destination;
	}

	function deepCopy(destination, source) {
		if (isObject(source)) {
			destination = isObject(destination) ? destination : {};
			for (var k in source)
				destination[k] = deepCopy(destination[k], source[k]);
		} else if (isArray(source)) {
			destination = [];
			for (var i = 0, l = source.length; i < l; i++)
				destination[i] = deepCopy(null, source[i]);
		} else if (isDate(source)) {
			destination = new Date(source.getTime());
		} else {
			destination = source;
		}
		return destination;
	}

	function defaults() {
		var result = {};
		each(toArray(arguments), function(source){
			if (source) {
				for (var k in source)
					if (!(k in result))
						result[k] = source[k];
			}
		});
		return result;
	}

	function merge() {
		var result = {};
		each(toArray(arguments), function(source){
			if (source) {
				for (var k in source)
					result[k] = source[k];
			}
		});
		return result;
	}

	function each(object, callback) {
		if (isIterable(object)) {
			for (var i = 0, l = object.length; i < l; i++)
				callback.call(object, object[i], i, l);
		} else if (object) {
			for (var i in object)
				callback.call(object, object[i], i);
		}
	}

	function filter(object, callback) {
		var result;
		if (isIterable(object)) {
			result = [];
			for (var i = 0, l = object.length; i < l; i++)
				if (callback.call(object, object[i], i, l))
					result.push(object[i]);
		} else if (isObject(object)) {
			result = {};
			for (var i in object)
				if (callback.call(object, object[i], i))
					result[i] = object[i];
		}
		return result;
	}

	function keys(object) {
		if (Object.keys) {
			return Object.keys(object);
		} else {
			var result = [];
			for (var k in object)
				result.ppush(k);ç
			return result;
		}
	}

	function map(object, callback) {
		var result = isObject(object) && !isIterable(object) ? {} : [];
		each(object, function(o, i){
			result[i] = callback(o);
		});
		return result;
	}

	function match(object, pattern) {
		if (isObject(pattern)) {
			if (isObject(object)) {
				for (var i in pattern)
					if (!match(object[i], pattern[i]))
						return false;
			} else {
				return false;
			}
		} else if (isIterable(pattern)) {
			if (isIterable(object)) {
				for (var i = 0, l = pattern.length; i < l; i++)
					if (!match(object[i], pattern[i]))
						return false;
			} else {
				return false;
			}
		} else if (isDate(pattern)) {
			return isDate(object) ? (object.getTime() === pattern.getTime()) : false;
		} else if (isRegExp(pattern)) {
			if (isRegExp(object)) {
				return object.toSource() === pattern.toSource();
			} else if (isSomething(object)) {
				return pattern.test(object.toString());
			} else {
				return false;
			}
		} else {
			return object === pattern;
		}
		return true;
	}

	function toArray(object) {
		if (arguments.length == 1) {
			if (isNothing(object)) return [];
			if (isArray(object)) return slice.call(object);
			if (isIterable(object)) return values(object);
			return [object];
		} else {
			var result = [];
			each(arguments, function(arg){
				result = result.concat(toArray(arg));
			});
			return result;
		}
	}

	function traverse(object, propertyList, separator) {
		if (isString(propertyList))
			propertyList = propertyList.split(separator || /\./g);

		if (propertyList.length) {
			var value;

			if (object !== null && object !== undefined)
				value = object[propertyList[0]];

			if (value === undefined)
				value = null;

			if (typeof value == "function")
				value = value.call(object);

			if (propertyList.length == 1) return value;
			if (value !== null) return traverse(value, propertyList.slice(1));
			return null;
		}
	}

	function values(object) {
		var result = [];
		for (var k in object)
			result.push(object[k]);
		return result;
	}

	function walk(object, callback) {
		each(object, function(value, k){
			callback.call(this, value, k);
			if (isObject(value) || isIterable(value))
				walk(value, callback);
		});
	}

	// Function functions

	function defer(fn) {
		if (typeof "setImmediate" == "function") {
			return setImmediate.apply(null, arguments);
		} else {
			var args = [fn, 0].concat(slice.call(arguments, 1));
			return setTimeout.apply(null, args);
		}
	}

	function limit(ms, fn) {
		var tid;
		return function() {
			clearTimeout(tid);
			tid = setTimeout.apply(null, [fn, ms].concat(slice.call(arguments)));
		};
	}

	function partial(fn) {
		var boundArgs = slice.call(arguments, 1);
		return function(){
			var args = boundArgs.concat(toArray(arguments));
			return fn.apply(null, args);
		};
	}

	// Array functions

	function by(fn) {
		fn.thenBy = _thenBy;
		return fn;
	}

	function _thenBy(fn) {
		var self = this;
		return by(function(a, b){
			return self(a, b) || fn(a, b);
		});
	}

	function contains(array, value) {
		return array.indexOf(value) != -1;
	}

	function join(array, glue, lastGlue) {
		if (array.length <= 2) {
			return array.join(lastGlue);
		} else {
			var a = array.slice(0, array.length - 1).join(glue);
			var b = array.slice(-1);
			return a + lastGlue + b;
		}
	}

	function permute(array, memo, results) {
		var cur;
		var memo = memo || [];
		var results = results || [];

		for (var i = 0; i < array.length; i++) {
			cur = array.splice(i, 1);
			if (array.length === 0)
				results.push(memo.concat(cur));
			permute(array.slice(), memo.concat(cur), results);
			array.splice(i, 0, cur[0]);
		}

		return results;
	}

	function pluck(array, properties) {
		properties = toArray(properties);
		var result = [];
		for (var i = 0, l = array.length; i < l; i++) {
			var item = {};
			for (var j = 0, m = properties.length; j < m; m++) {
				item[properties[j]] = array[i][properties[j]];
			}
			result.push(item);
		}
		return result;
	}

	function pushUnique(array, value) {
		if (!contains(array, value)) return array.push(value);
	}

	function remove(array, value) {
		do {
			var i = array.lastIndexOf(value);
			if (i == -1) return array;
			array.splice(i, 1);
		} while(true);
	}

	function shuffle(array) {
		var m = array.length, t, i;
		while (m) {
			i = Math.floor(Math.random() * m--);
			t = array[m];
			array[m] = array[i];
			array[i] = t;
		}
		return array;
	}

	function unique(array) {
		var result = [];
		each(array, partial(pushUnique, result));
		return result;
	}

	// String functions

	function escapeHTML(string) {
		return string.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;");
	}

	function escapeRegExp(string) {
		return string.replace(/([.*+?$^(){}|[\]\/\\])/g, "\\$1");
	}

	var cache = {};
	var escapes = {
		"'":	  "'",
		'\\':	 '\\',
		'\r':	 'r',
		'\n':	 'n',
		'\t':	 't',
		'\u2028': 'u2028',
		'\u2029': 'u2029'
	};
	var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
	var noMatch = /(.)^/;
	var defaultOptions = {
		interpolate: /\{([\s\S]+?)\}/g,
		escape: /\{\{([\s\S]+?)\}\}/g,
		evaluate: /<\?([\s\S]+?)\?>/g
	};

	function _compileTemplate(string, options) {
		var index = 0;
		var source = "__buffer__='";
		var matcher = new RegExp([
			(options.evaluate || noMatch).source,
			(options.escape || noMatch).source,
			(options.interpolate || noMatch).source
		].join('|') + '|$', 'g');

		string.replace(matcher, function(match, evaluate, escape, interpolate, offset){
			source += string.slice(index, offset).replace(escaper, function(m){
				return "\\" + escapes[m];
			});

			if (evaluate)
				source += "';\n" + evaluate + "\n__buffer__+='";

			if (interpolate)
				source += "'+\n(function(){try{var __expr__=(" + interpolate + ");if(__expr__===undefined||__expr__===null)return'';return __expr__.toString()}catch(__ex__){return '';}}).call(this)+\n'";

			if (escape)
				source += "'+\n(function(){try{return escapeHTML(" + escape + ");}catch(__ex__){return ''}}).call(this)+\n'";

			index = offset + match.length;

			return match;
		});

		source += "';\n";
		source = "with(this){" + source + "}";
		source = "var __buffer__='',print=function(){__buffer__+=Array.prototype.join.call(arguments,'');};\n" + source + "return __buffer__;\n";

		return source;
	}

	function fill(string, data, options) {
		if (!isString(string)) return "";
		if (!data) return string;

		options = defaults(defaultOptions, options);

		var parameters = defaults(options.context, exports);

		var source = _compileTemplate(string, options);
		var render = Function.apply(null, keys(parameters).concat(source));
		var result = render.apply(data, values(parameters));

		return result;
	}

	function links(string, target) {
		return string.replace(/(http:\/\/((\S+)|$))/g, target ? ('<a href="$1" target="' + target + '">$1</a>') : '<a href="$1">$1</a>');
	}

	function stripHTML(string, activeContentOnly) {
		if (activeContentOnly)
			return string.replace(/<(script|object|applet|iframe|embed).*>[^<]*<\/\1>/gi, " ");
		else
			return string.replace(/<\/?[^>]+>/gi, " ").replace(/&.+;/, "").replace(/[\s]{2,}/g, " ");
	}

	// Number functions

	function distance(x1, y1, x2, y2){
		return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
	}

	function deg2rad(angle){
		return angle * Math.PI / 180;
	}

	function fit(n, start, end) {
		if (n < start)
			return start;
		else if (n > end)
			return end;
		else
			return n;
	}

	function plural(n, sng, pl, hideNumber) {
		var result = n == 1 ? sng : pl;
		if (!hideNumber)
			result = n + " " + result;
		return result;
	}

	function rad2deg(angle){
		return angle * 180 / Math.PI;
	}

	function random(min, max) {
		if (isNothing(max)) {
			max = min;
			min = 0;
		}
		return min + Math.floor(Math.random() * (max - min + 1));
	}

	function toPrecision(n, e) {
		var p = Math.pow(10, e);
		return Math.round(n * p) / p;
	}

	return exports = {
		self: self,

		isArray: isArray, isBoolean: isBoolean,
		isDate: isDate, isFunction: isFunction, isIterable: isIterable,
		isNothing: isNothing, isNull: isNull, isNumber: isNumber,
		isNumericString: isNumericString, isObject: isObject, isRegExp: isRegExp,
		isScalar: isScalar, isSomething: isSomething, isString: isString,
		isUndefined: isUndefined, isWhat: isWhat,

		clone: clone, copy: copy, deepCopy: deepCopy, defaults: defaults,
		each: each, filter: filter, keys: keys, map: map, match: match, merge: merge,
		pluck: pluck, toArray: toArray, traverse: traverse, values: values,
		walk: walk,

		defer: defer, limit: limit, partial: partial,

		by: by, contains: contains, join: join, permute: permute,
		pushUnique: pushUnique, remove: remove, shuffle: shuffle,
		unique: unique,

		escapeHTML: escapeHTML, escapeRegExp: escapeRegExp, fill: fill,
		links: links, stripHTML: stripHTML,

		distance: distance, deg2rad: deg2rad, fit: fit, plural: plural,
		rad2deg: rad2deg, random: random, toPrecision: toPrecision
	};
});
