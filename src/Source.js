define([
	"./lib/extend",
	"./lib/request",
	"./lib/util",
	"jquery"
], function(extend, request, util, $){

	var ready = Symbol();

	function Source(options) {
		this.options = options || {};
		this[ready] = $.Deferred();
		this.ready = this[ready].promise();
	}

	Source.prototype = {

		create: function(model, callback) {
			throw new Error("Not implemented");
		},

		del: function(model, callback) {
			setTimeout(callback, 0, false);
		},

		get: function(id, callback) {
			throw new Error("Not implemented");
		},

		getAll: function(query, callback) {
			if (typeof query == "function") {
				callback = query;
				query = this.options.query;
			} else {
				query = util.copy(util.copy({}, this.options.query), query);
			}

			if (this.options.all === false && this.ready.state() == "pending") {
				callback(false, []);
				this[ready].resolve();
				return this[ready].promise();
			} else {
				return this.request(query, callback);
			}
		},

		request: function(query, callback) {
			throw new Error("Not implemented");
		},

		update: function(model, callback) {
			throw new Error("Not implemented");
		}
	};

	function GETSource(path, options) {
		Source.call(this, options);
		this.path = path;
	}

	GETSource.prototype = {

		request: function(query, callback) {
			return request.get(this.path, query)
				.done(function(data){
					callback(data === null, data);
					this[ready].resolve(data);
				}.bind(this))
				.fail(function(){
					callback(true);
					this[ready].reject();
				}.bind(this))
			;
		}
	};

	extend(GETSource, Source);

	function RESTSource(path, options) {
		Source.call(this, options);
		this.path = path;

		if (this.options.stopTryingAfter)
			this.retrials = {};
	}

	RESTSource.prototype = {

		create: function(model, callback) {
			return request.post(this.path)
			.done(function(data){
				callback(false, data);
			})
			.fail(function(){
				callback(true);
			});
		},

		del: function(id, callback) {
			return request.del(this.path + "/" + id)
			.done(function(){
				if (callback)
					callback(false);
			})
			.fail(function(){
				if (callback)
					callback(true);
			});
		},

		get: function(id, callback) {
			if (this.retrials && id in this.retrials && this.retrials[id] > this.options.stopTryingAfter)
				return;

			var fail = function() {
				if (this.retrials) {
					if (this.retrials[id]) {
						this.retrials[id]++;
					} else {
						this.retrials[id] = 1;
					}
				}
				callback(true);
			}.bind(this);

			return request.get(this.path + "/" + id, this.options.query)
				.done(function(data){
					if (data) {
						callback(false, data);
					} else {
						fail();
					}
				})
				.fail(fail)
			;
		},

		update: function(id, model, callback) {
			return request.post(this.path + "/" + id, model.toJSON())
			.done(function(data){
				callback(false, data);
			})
			.fail(function(){
				callback(true);
			});
		}
	};

	extend(RESTSource, GETSource);

	function LocalSource() {

	}

	Source.GET = GETSource;
	Source.REST = RESTSource;
	Source.Local = LocalSource;

	return Source;
});
