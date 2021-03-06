define([
	"./lib/EventEmitter",
   	"./lib/extend",
], function(EventEmitter, extend){

	function Application(router, viewFactory, viewStack, modalViewStack) {
		this.router = router;
		this.viewFactory = viewFactory;
		this.viewStack = viewStack;
		this.modalViewStack = modalViewStack;
	}

	Application.prototype = {

		go: function(path, args) {
			this.router.dispatch(path, null, args);
		},

		modal: function(name, data, options, callback) {

			if (typeof data == "function") {
				callback = data;
				options = undefined;
				data = undefined;
			}

			if (typeof options == "function") {
				callback = options;
				options = undefined;
			}

			options  || (options = {});

			this.viewFactory.make(name, data, options, function(view){
				this.modalViewStack.push(view);

				view.once("done", function(result){
					if (callback)
						callback(result);
				});
			}.bind(this));
		},

		notfound: function() {
			this.router.dispatch("404");
		},

		view: function(name, options) {
			var self = this;
			options = options || {};

			return function(entry) {
				//if (entry.view) {
				//	this.viewStack.setView(entry.view);
				//} else {
					self.viewFactory.make(name, entry, options, function(view){
						//entry.view = view;
						self.viewStack.reset();

						self.viewStack.setView(view);
						view.once("stale", function(){
							self.view(name, options)(entry, true);
						});
					});
				//}
			};
		}
	};

	extend(Application, EventEmitter);

	return Application;
});
