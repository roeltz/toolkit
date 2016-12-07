define([
	"./Stateful",
], function(Stateful){

	function Model(data, extra, options) {
		var state = {};

		for (var k in data)
			if (data.hasOwnProperty(k))
				state[k] = data[k];

		if (extra)
			for (var k in extra)
				if (extra.hasOwnProperty(k))
					state[k] = extra[k];

		Stateful.call(this, state, options);
	}

	Model.prototype = {

		del: function(callback) {
			if (this._deleted) return;
			else this._deleted = true;

			var deferred = false;

			function defer() {
				deferred = true;
			}

			this.emit("delete", defer, callback || function(){});

			if (!deferred && callback)
				callback(false);
		},

		save: function() {
			if (this._dirty && this.validate()) {
				this._dirty = false;
				this.emit("save");
			}
		},

		validate: function() {
			return true;
		}
	};

	Stateful.extend(Model);

	return Model;
});
