define([
	"./lib/EventEmitter",
	"./lib/extend",
	"./lib/find",
	"./lib/util"
], function(EventEmitter, extend, find, util){

	function Route(path, callback) {
		this.callback = callback;
		this.params = [];
		var expression = path.replace(/\{(\w+?)\}/g, function(x, m){
			this.params.push(m);
			return "([^/]+)";
		}.bind(this)).replace(/\./g, "\\.");
		this.regex = new RegExp("^" + expression + "$");
	}

	Route.prototype = {

		matches: function(path) {
			var matches = this.regex.exec(path);
			if (matches) {
				var args = {};
				this.params.map(function(param, i){
					args[param] = matches[i + 1];
				});
				return args;
			}
		}
	};

	function State(data) {
		EventEmitter.call(this);

		Object.defineProperty(this, "_events", {
			enumerable: false,
			writable: true
		});

		for (var key in data)
			this[key] = data[key];
	}

	State.prototype = {

		save: function() {
			setTimeout(function(){
				this.emit("save");
			}.bind(this), 0);
		}
	};

	extend(State, EventEmitter);

	function Router() {
		this.routes = {};
		this.entries = {};
		this.intermediates = {};

		this.restore();
	}

	Router.prototype = {

		add: function(path, callback) {
			if (typeof path == "string") {
				this.routes[path] = new Route(path, callback);
			} else {
				for (var key in path)
					this.add(key, path[key]);
			}
		},

		addIntermediate: function(callback) {
			var entry = history.state && history.state.entry || Date.now();

			if (!(entry in this.intermediates))
				this.intermediates[entry] = [];

			this.intermediates[entry].push(callback);
			history.pushState({entry: entry}, "");
		},

		bind: function() {
			window.addEventListener("click", this.processClick.bind(this));
			window.addEventListener("popstate", this.processState.bind(this));
		},

		createState: function(data) {
			var state = new State(data);
			state.on("save", this.save.bind(this));
			return state;
		},

		createRegisteredState: function(data, path) {
			var state = this.createState(util.defaults(data, {path: path}));
			var entry = Date.now();
			this.entries[entry] = state;
			history.pushState({entry: entry}, "", path);
			return state;
		},

		dispatch: function(path, entry, args) {
			for (var key in this.routes) {
				var match = this.routes[key].matches(path);
				if (match) {
					var state;
					if (!args)
						args = match;

					if (entry in this.entries) {
						state = this.entries[entry];
					} else if (entry) {
						state = this.createState({args: args});
					} else {
						state = this.createRegisteredState({args: args}, path);
					}
					return this.routes[key].callback(state);
				}
			}

			this.emit("notfound", this.createRegisteredState({args: {}}, path));
		},

		processClick: function(e) {
			var anchor = find(e.target, "a[href]:not([target]):not([rel='external']):not([download]):not([href^='javascript:'])");
			if (anchor && e.button === 0) {
				e.preventDefault();
				this.dispatch(anchor.pathname);
			}
		},

		processState: function(e) {
			if (e.state && e.state.entry) {
				var entry = e.state.entry;
				if (entry in this.intermediates) {
					var callback = this.intermediates[entry].shift();
					if (callback) callback();
				} else {
					this.dispatch(location.pathname, entry);
				}
			}
		},

		restore: function() {
			if (sessionStorage.routerEntries) {
				var entries = JSON.parse(sessionStorage.routerEntries);
				for (var key in entries)
					this.entries[key] = this.createState(entries[key]);
			}
		},

		save: function() {
			sessionStorage.routerEntries = JSON.stringify(this.entries);
		},

		start: function() {
			this.bind();
			this.dispatch(location.pathname, history.state ? history.state.entry || false : false);
		}
	};

	extend(Router, EventEmitter);

	return Router;
});
