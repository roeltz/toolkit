define([

], function(){

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
				this.render(this.cache[name], data, options, callback);
			} else {
				this.load(name, options, function(elements){
					this.make(name, data, options, callback);
					this.cache[name] = elements;
				}.bind(this));
			}
		},

		render: function(elements, data, options, callback) {
			throw new Error("Not implemented");
		}
	};

	return ViewFactory;
});
