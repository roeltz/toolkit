define([
	"./lib/EventEmitter",
	"./lib/extend",
	"./lib/find"
], function(EventEmitter, extend, find){

	function Watcher(e, options) {
		this.e = e;
		this.options = options || {};
		this.watches = [];
		this.disposables = [];
		this.intervals = [];
		this.timeouts = [];
	}

	Watcher.extend = function(constructor) {
		extend(constructor, this);
		constructor.extend = this.extend;
		return constructor;
	};

	Watcher.prototype = {

		delegate: function(events) {
			if (this.events && !this.hasOwnProperty("events")) {
				var protoevents = this.events;
				this.events = {};
				for (var k in protoevents)
					this.events[k] = protoevents[k];
			} else if (!this.events) {
				this.events = {};
			}

			for (var key in events) {
				this.events[key] = events[key];

				(function(key, callback){
					var event;
					var containerSelector;
					var targetSelector;

					if (/^([\w-]+)\s+(?:\(([^)]+)\)\s+)?(.+)$/.test(key)) {
						event = RegExp.$1;
						containerSelector = RegExp.$2;
						targetSelector = RegExp.$3;
					} else {
						event = key;
					}

					this.e.addEventListener(event, function(ev){
						var target = targetSelector ? find(ev.target, targetSelector, this.e) : this.e;
						if (target) {
							if (containerSelector)
								target = find(target, containerSelector, this.e);
							if (target)
								return callback.call(this, ev, target);
						}
					}.bind(this));
				}).call(this, key, typeof events[key] == "function" ? events[key] : this[events[key]]);
			}
		},

		dispose: function() {
			this.emit("dispose");
			this.removeAllListeners();
			this.watches.forEach(function(tuple){
				if (tuple[0].removeEventListener) {
					tuple[0].removeEventListener(tuple[1], tuple[2]);
				} else {
					tuple[0].off(tuple[1], tuple[2]);
				}
			});
			this.disposables.forEach(function(d){
				d.dispose();
			});
			this.intervals.forEach(function(i){
				clearInterval(i);
			});
			this.timeouts.forEach(function(t){
				clearTimeout(t);
			});
			this.watches = null;
			this.disposables = null;
			this.intervals = null;
			this.timeouts = null;
		},

		setInterval: function() {
			this.intervals.push(setInterval.apply(window, arguments));
		},

		setTimeout: function() {
			this.timeouts.push(setTimeout.apply(window, arguments));
		},

		watch: function(object, event, handler, context) {
			if (arguments.length >= 3 && typeof handler == "string") {
				handler = this[handler].bind(object);
			} else if (arguments.length == 2) {
				handler = event;
				event = object;
				object = this.model;
			} else if (arguments.length == 1 && object.dispose) {
				this.disposables.push(object);
				return object;
			}

			if (object.addEventListener) {
				object.addEventListener(event, handler.bind(context || this));
			} else if (object.on) {
				object.on(event, handler.bind(context || this));
			} else {
				throw new Error("Object cannot listen to events");
			}
			this.watches.push([object, event, handler]);
		}
	};

	extend(Watcher, EventEmitter);

	return Watcher;
});
