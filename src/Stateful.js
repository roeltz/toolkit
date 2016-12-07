define([
	"./lib/extend",
	"./EventEmitter"
], function(extend, EventEmitter){

	var setImmediate = window.setImmediate || function(fn){
		return setTimeout.apply(window, [fn, 0].concat(Array.prototype.slice.call(arguments)));
	};

	var clearImmediate = window.clearImmediate || function(id){
		return clearTimeout(id);
	};

	function Stateful(state, options) {
		state || (state = {});
		options || (options = {});
		EventEmitter.call(this);
		Stateful.internal(this, "_events");
		Stateful.internal(this, "_state", {});
		Stateful.internal(this, "_dirty", false);
		Stateful.internal(this, "_changeTID", false);
		Stateful.internal(this, "_ignore", []);
		Stateful.object(this, state, options);

		for (var property in state)
			if (state.hasOwnProperty(property))
				this.set(property, state[property]);
	}

	Stateful.GUID = (function() {
		var ref = 0;
		return function() {
			return ++ref;
		};
	})();

	Stateful.extend = function(constructor) {
		extend(constructor, this);
		constructor.extend = this.extend;
		constructor.GUID = this.GUID;
		return constructor;
	};

	Stateful.object = function(object, state, options) {
		options || (options = {});

		if (options.ignore)
			object._ignore = options.ignore;

		for (var method in object.computed)
			Stateful.property(object, method);

		for (var property in state)
			if (state.hasOwnProperty(property))
				Stateful.property(object, property, !options.inhibit || !(property in options.inhibit));
	};

	Stateful.property = function(object, property, watch) {
		Object.defineProperty(object, property, {
			enumerable: true,
			get: function() {
				return this.get(property);
			},
			set: function(value) {
				return this.set(property, value);
			}
		});

		if (watch && object._state[property] instanceof Stateful) {
			object._state[property].on("change", function(chain){
				if (chain.indexOf(object) == -1) {
					chain.push(object);
					if (object._ignore.indexOf(property) == -1) {
						object.emit("change-property:" + property, object._state[property]);
						object.emit("change-property", property, object._state[property]);
						object.emit("change", chain);
					}
				}
			});
		}
	};

	Stateful.internal = function(object, property, value) {
		Object.defineProperty(object, property, {
			enumerable: false,
			value: value,
			writable: true
		});
	};

	Stateful.prototype = {

		computed: {},

		expect: function(property, callback) {
			var value = this[property];
			if (value !== undefined && value !== null) {
				callback(value);
			} else {
				this.once("change-property:" + property, callback);
			}
		},

		get: function(property) {
			if (property in this.computed) {
				return this.computed[property].call(this);
			} else {
				return this._state[property];
			}
		},

		reset: function(state) {
			for (var property in state) {
				this.set(property, state[property]);
				if (!this.hasOwnProperty(property) && state.hasOwnProperty(property))
					Stateful.property(this, property);
			}
		},

		set: function(property, newValue) {
			var oldValue = this._state[property];

			if (this.intercepted && property in this.intercepted)
				newValue = this.intercepted[property].call(this, newValue, oldValue);

			if (newValue === oldValue)
				return;

			if (oldValue instanceof Stateful && !(newValue instanceof Stateful)) {
				oldValue.reset(newValue instanceof Stateful ? newValue.toJSON() : newValue);
			} else {
				this._state[property] = newValue;
			}

			this._dirty = true;
			this.emit("change-property:" + property, newValue);
			this.emit("change-property", property, newValue);
			clearTimeout(this._changeTID);
			this._changeTID = setTimeout(function(){
				this.emit("change", [this]);
			}.bind(this), 0);
		},

		toJSON: function(visited) {
			var state = {};
			for (var p in this._state) {
				if (!this.cyclic || this.cyclic.indexOf(p) == -1) {
					var value = this._state[p];
					state[p] = (value && value.toJSON) ? value.toJSON() : value;
				}
			}
			return state;
		}
	};

	extend(Stateful, EventEmitter);

	return Stateful;
});
