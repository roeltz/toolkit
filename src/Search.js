define([
   	"./lib/extend",
	"./lib/serializeObject",
	"./Collection",
	"./EventEmitter",
	"jquery"
], function(extend, serializeObject, Collection, EventEmitter, $){

	function SearchCollection(search, collection, filter) {
		var self = this;

		Collection.Filtered.call(this, collection, {
			query: function(item){
				return filter(item, search.lastParams);
			}.bind(this),
			source: false,
			defer: true
		});

		this.repeatEventsFrom(collection, ["source-loading", "source-complete"]);

		search.on("change", function(){
			self.update();
		});
	}

	Collection.Filtered.extend(SearchCollection);

	function Search(e, options) {
		this.e = e;
		this.$e = $(e);
		this.lastParams = this.getParams();
		this.options = options || {};

		if (!this.options.delay)
			this.options.delay = Search.DELAY_REGULAR;

		if (this.options.trigger)
			setTimeout(this.handle.bind(this), 0, true);

		this.bind();
	}

	Search.INPUT_EVENT = "input";
	Search.DELAY_SHORT = 100;
	Search.DELAY_REGULAR = 400;
	Search.DELAY_LONG = 800;
	Search.DELAY_LONGEST = 1600;

	Search.prototype = {

		bind: function() {
			var self = this;

			this.$e.on(Search.INPUT_EVENT, ".search-trigger", function(){
				self.handle();
			});
			this.e.addEventListener("submit", function(e){
				e.preventDefault();
			});
		},

		filter: function(inputCollection, filter) {
			return new SearchCollection(this, inputCollection, filter);
		},

		filterSource: function(inputCollection, options) {
			options || (options = {});

			this.on("change", function(query){
				inputCollection.resetFromSource(query);
			});

			return inputCollection;
		},

		getDelay: function() {
			if (typeof this.options.delay == "function") {
				return this.options.delay(this.getParams());
			} else {
				return this.options.delay;
			}
		},

		getParams: function() {
			return serializeObject(this.e);
		},

		handle: function(immediate) {
			this.lastParams = this.getParams();
			clearTimeout(this.tid);
			this.tid = setTimeout(this.trigger.bind(this), immediate ? 0 : this.getDelay(), this.lastParams);
		},

		trigger: function(params) {
			if (this.submit("trigger", params))
				this.emit("change", params);
		}
	};

	extend(Search, EventEmitter);

	return Search;
});
