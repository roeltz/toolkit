define([
	"./lib/util",
	"./Model",
	"./Stateful"
], function(util, Model, Stateful){

	function Collection(items, options) {
		if (!Array.isArray(items)) {
			options = items;
			items = [];
		}

		this.bulkAction = false;
		this.index = {};
		this.handlers = {};
		this.items = [];
		this.length = 0;
		this.lastLength = 0;
		this.options = options || {};
		this.resetInProgress = false;
		this.pendingRequests = {};
		this.failed = [];

		Stateful.call(this);

		if (!this.options.of)
			this.options.of = Model;

		if (!this.options.pk)
			this.options.pk = "id";

		if (this.options.source)
			this.source = this.options.source;

		this.init(items);
	}

	/*** Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 ***/
	Collection.by = (function(){function e(f){f.thenBy=t;return f}function t(y,x){x=this;return e(function(a,b){return x(a,b)||y(a,b)})}return e})();

	Collection.byNumber = function(property) {
		return function(a, b) {
			return a - b;
		};
	};

	Collection.byString = function(property) {
		return function(a, b) {
			return (a[property] || "").localeCompare(b[property] || "");
		};
	};

	Collection.prototype = {

		add: function(item) {
			var source = this.source;
			var pk = this.options.pk;
			var pkv = item[pk];

			if (this.options.uplink) {
				item[this.options.uplink[0]] = this.options.uplink[1];
			}

			if (!(item instanceof this.options.of)) {
				item = new this.options.of(item);
				pkv = item[pk];
			}

			if (pkv in this.index) {
				this.index[pkv].reset(item);
				return item;
			}

			this.items.push(item);
			this.index[pkv] = item;
			this.handlers[pkv] = {};

			item.on("change", this.handlers[pkv].onchange = function(chain){
				this.settle(chain);
			}.bind(this));

			item.on("delete", this.handlers[pkv].ondelete = function(defer, callback){
				var proceed = function(err){
					if (!err)
						this.remove(item);
					callback(err);
				}.bind(this);

				if (source) {
					defer();
					source.del(pkv, proceed);
				} else {
					proceed();
				}
			}.bind(this));

			if (source) {
				item.on("save", this.handlers[pkv].onsave = function(isNew){
					if (isNew) {
						source.create(item, function(){});
					} else {
						source.update(pkv, item, function(){});
					}
				});
			}

			this.emit("add", item);

			if (!this.bulkAction)
				this.settle();

			return item;
		},

		addAll: function(items) {
			this.bulkAction = true;
			var result = [];
			for (var i = 0, l = items.length; i < l; i++)
			 	result.push(this.add(items[i]));
			this.bulkAction = false;
			this.settle();
			return result;
		},

		buildIndexes: function() {
			this.length = this.items.length;

			for (var i = 0, it = this.items, l = it.length; i < l; i++)
				this[i] = it[i];

			while (this[i++])
				delete this[i];
		},

		filter: function(options) {
			return new FilteredCollection(this, options);
		},

		find: function(query, callback) {
			var self = this;

			if (callback) {
				return this.getAll(function(){
					callback(self.find(query));
				});
			} else {
				return this.items.filter((typeof query == "function") ? query : function(item){
					return self.matches(item, query);
				});
			}
		},

		get: function(id, always, callback) {
			var self = this;

			if (typeof always == "function") {
				callback = always;
				always = false;
			}

			if (this.failed.indexOf(id) == -1) {
				if (callback) {
					if (id in this.index) {
						setTimeout(callback, 0, this.index[id]);
					} else if (this.source) {
						if (this.source.ready.state() == "resolved") {
							if (id in this.pendingRequests) {
								this.pendingRequests[id].done(function(){
									self.get(id, callback);
								});
							} else {
								this.pendingRequests[id] = this.source.get(id, function(err, itemData){
									var item;

									if (!err && itemData)
										item = self.add(itemData);

									delete self.pendingRequests[id];

									if (item || always)
										callback(item);
								});
							}
						} else {
							this.source.ready.done(function(){
								self.get(id, callback);
							});
							this.resetFromSource();
						}
					}
				} else {
					return this.index[id];
				}
			}
		},

		getAt: function(index) {
			return this.items[index];
		},

		getAll: function(callback) {
			var self = this;

			if (callback) {
				if (this.source && this.source.ready.state() == "pending" && !this._resetting) {
					this._resetting = true;
					this.resetFromSource(function(){
						delete self._resetting;
						callback(self.items.slice());
					});
				} else if (this._resetting) {
					this.source.ready.then(function(){
						self.getAll(callback);
					});
				} else {
					callback(this.items.slice());
				}
			} else {
				return this.items.slice();
			}
		},

		getAllIndexed: function() {
			var index = {};
			var pk = this.options.pk;
			this.items.forEach(function(item){
				index[item[pk]] = item;
			});
			return index;
		},

		getIndexes: function() {
			var pk = this.options.pk;
			return this.items.map(function(item){
				return item[pk];
			});
		},

		has: function(item) {
			return this.items.indexOf(item) != -1;
		},

		hasIndex: function(id) {
			return id in this.index;
		},

		init: function(items) {
			if (items.length) {
				this.addAll(items);
			} else if (this.options.items) {
				this.addAll(this.options.items);
			} else if (this.source && !this.options.defer) {
				setTimeout(this.resetFromSource.bind(this), 0);
			}
		},

		insert: function(items, position) {
			if (position === undefined)
				position = this.items.length;

			var lastIndex = this.items.length;
			items = this.addAll(items);
			this.items.splice(lastIndex, items.length);
			this.items.splice.apply(this.items, [position, 0].concat(items));
			this.settle();
		},

		map: function(options) {
			return new MappedCollection(this, options);
		},

		matches: function(item, query) {
			if (query) {
				for (var property in query)
					if (item[property] != query[property])
						return false;
			}
			return true;
		},

		move: function(item, position) {
			var index = this.items.indexOf(item);
			this.items.splice(position, 0, item);
			this.items.splice(index > position ? index + 1 : index, 1);
			this.settle();
		},

		push: function() {
			return this.add.apply(this, arguments);
		},

		remove: function(item) {
			var index = this.items.indexOf(item);
			var pkv = item[this.options.pk];
			if (index != -1) {
				this.items.splice(index, 1);

				item.off("change", this.handlers[pkv].onchange);
				item.off("delete", this.handlers[pkv].ondelete);
				if (this.handlers[pkv].onsave)
					item.off("save", this.handlers[pkv].onsave);

				delete this.index[pkv];
				delete this.handlers[pkv];

				this.emit("remove", item, this.resetInProgress);

				if (!this.bulkAction)
					this.settle();
			}
		},

		removeAll: function() {
			this.bulkAction = true;
			while (this.items.length)
				this.remove(this.items[0]);
			this.bulkAction = false;
			this.settle();
		},

		reset: function(items) {
			this.resetInProgress = true;
			this.removeAll();
			this.addAll(items || []);
			this.resetInProgress = false;
		},

		resetFromSource: function(query, callback) {
			if (typeof query == "function") {
				callback = query;
				query = undefined;
			}

			if (this.resetInProgress && !query)
				return this.resetInProgress.done(callback);

			if (this.source) {
				if (query === undefined)
					query = this.lastSourceQuery;

				this.emit("source-loading");
				var request = this.source.getAll(query, function(err, items){
					if (err) {
						this.emit("source-error");
					} else {
						this.emit("source-success");
						if (this.options.sourceFilter) {
							this.options.sourceFilter.call(this, items, function(items){
								this.reset(items);
							});
						} else {
							this.reset(items);
						}
					}
					this.emit("source-complete");

					if (callback)
						callback(err, items);

					this.resetInProgress = null;
				}.bind(this));

				if (!query)
					this.resetInProgress = request;

				this.lastSourceQuery = query;
			}
		},

		set: function(id, item) {
			var currentItem = this.index[id];
			if (currentItem) {
				if (currentItem.off)
					currentItem.off("change");
				var currentIndex = this.items.indexOf(currentItem);
				this.items.splice(currentIndex, 1, item);
				this.settle();
			} else {
				this.add(item);
			}
		},

		settle: function(chain) {
			this.buildIndexes();
			clearTimeout(this._settleTID);
			this._settleTID = setTimeout(function(){
				this.sort(true, chain);
			}.bind(this), 0);
		},

		sort: function(emit, chain) {
			if (this.options.sort) {
				this.items.sort(this.options.sort);
				this.emit("sort");
			}
			if (emit) {
				if (this.lastLength != this.length) {
					this.emit("change-length", this.length - this.lastLength);
					this.lastLength = this.length;
				}

				chain || (chain = []);
				chain.push(this);
				this.emit("change", chain);
			}
		},

		toArray: function() {
			return this.items.slice();
		},

		toJSON: function(visited) {
			return this.items.map(function(value){
				return (value && value.toJSON) ? value.toJSON() : value;
			});
		}
	};

	Stateful.extend(Collection);

	function MappedCollection(collection, options) {
		var self = this;

		if (typeof options == "function")
			options = {mapper: options};

		Collection.call(this, options);
		this.collection = collection;

		this.collection.on("change", function(chain){
			self.update(null, chain);
		});

		this.update();
	}

	MappedCollection.prototype = {

		requestFilteredItems: function(callback) {
			callback(this.collection.items.map(this.options.mapper));
		},

		update: function(query, chain) {
			var self = this;

			chain || (chain = []);

			if (chain.indexOf(this) == -1) chain.push(this);
			else return;

			if (query)
				this.options.query = query;

			var currentItems = this.items.slice();
			this.bulkAction = true;

			this.requestFilteredItems(function(newItems){
				currentItems.forEach(function(item){
					if (newItems.indexOf(item) == -1)
						self.remove(item);
				});
				newItems.forEach(function(item){
					if (self.items.indexOf(item) == -1)
						self.add(item);
				});

				self.bulkAction = false;
				self.settle(chain);
			});
		}
	};

	function FilteredCollection(collection, options) {
		MappedCollection.call(this, collection, util.defaults(options, collection.options));
	}

	FilteredCollection.prototype = {

		requestFilteredItems: function(callback) {
			this.collection.find(this.options.query, callback);
		}
	};

	Collection.Mapped = MappedCollection;
	Collection.Filtered = FilteredCollection;
	Collection.extend(MappedCollection);
	MappedCollection.extend(FilteredCollection);

	return Collection;
});
