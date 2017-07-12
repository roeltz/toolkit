define([
	"./lib/extend",
	"./EventEmitter"
], function(extend, EventEmitter){

	function ViewFactory(options) {
		this.cache = {};
		this.options = options || {};
	}

	ViewFactory.prototype = {

		load: function(name, options, callback) {
			throw new Error("Not implemented");
		},

		make: function(name, data, options, callback) {
			if (name in this.cache) {
				this.emit("render", name, data, options);
				this.render(this.cache[name], data, options, callback);
			} else {
				this.emit("load-start", name, data, options);
				this.load(name, options, function(err, elements){
					if (err) {
						this.emit("load-error", err, name, data, options);
					} else {
						this.emit("load-success", elements, name, data, options);
						this.make(name, data, options, callback);
						this.cache[name] = elements;
					}
					this.emit("load-end", err, elements, name, data, options);
				}.bind(this));
			}
		},

		render: function(elements, data, options, callback) {
			throw new Error("Not implemented");
		}
	};

	extend(ViewFactory, EventEmitter);

	return ViewFactory;
});
