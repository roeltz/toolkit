define([
	"./lib/EventEmitter",
	"./lib/extend"
], function(BaseEventEmitter, extend){

	function Event() {
		this.cancelled = false;
	}

	Event.prototype = {

		isDefaultPrevented: function() {
			return this.cancelled;
		},

		preventDefault: function() {
			this.cancelled = true;
		}
	};

	function EventEmitter() {
		this.value = false;
	}

	EventEmitter.prototype = {

		forwardEventsTo: function(emitter, events) {
			var self = this;
			events.forEach(function(e){
				self.on(e, function(){
					emitter.emit.apply(self, arguments);
				});
			});
		},

		repeatEventsFrom: function(emitter, events) {
			var self = this;
			events.forEach(function(e){
				emitter.on(e, function(){
					self.emit.apply(self, arguments);
				});
			});
		},

		submit: function() {
			var event = new Event();
			var args = Array.prototype.slice.call(arguments).concat(event);
			this.emit.apply(this, args);
			return !event.isDefaultPrevented();
		}
	};

	extend(EventEmitter, BaseEventEmitter);

	return EventEmitter;
});
