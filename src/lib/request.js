define([
	"jquery",
	"./util",
	"./EventEmitter"
], function($, util, EventEmitter){

	var copy = util.copy;

	var emitter = new EventEmitter();

	function parseDates(data) {
		util.walk(data, function(v, k){
			if (typeof v == "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?Z/.test(v)) {
				this[k] = new Date(+RegExp.$1, +RegExp.$2 - 1, +RegExp.$3, +RegExp.$4, +RegExp.$5, +RegExp.$6);
			}
		});
	}

	function request(method, url, data, options) {
		var deferred = $.Deferred();

		emitter.emit("start", method, url, data, options);

		options = copy({
			type: method,
			url: url,
			data: data,
			dataType: "json",
			success: function(response, textStatus, jqXHR){
				parseDates(response);

				emitter.emit("success-response", response, jqXHR, function(replacement){
					response = replacement;
				});

				deferred.resolve(response);
				emitter.emit("success", response);
				emitter.emit("end", false, response);
			},
			error: function(jqXHR, textStatus, errorThrown){
				var response = null;

				try {
					response = JSON.parse(jqXHR.responseText);
					parseDates(response);
				} catch(ex) {}

				emitter.emit("error-response", response, jqXHR, function(replacement){
					response = replacement;
				});

				deferred.reject(response);
				emitter.emit("error", response);
				emitter.emit("end", true, response);
			},
			xhr: function() {
				var xhr = $.ajaxSettings.xhr();

				function getInfo(event, type) {
					var percentage = 0;
					var loaded = event.loaded || event.position;
					var total = event.total;

					if (event.lengthComputable) {
						percentage = loaded / total * 100;
					}

					return {
						type: type,
						lengthComputable: event.lengthComputable,
						loaded: loaded,
						total: total,
						percentage: percentage
				   };
				}

				xhr.addEventListener("progress", function(event) {
					deferred.notify(getInfo(event, "download"));
				}, false);

				if (xhr.upload) {
					xhr.upload.addEventListener("progress", function(event) {
						deferred.notify(getInfo(event, "upload"));
					}, false);
				}
				return xhr;
			}
		}, options || {});

		if (window.FormData && data instanceof window.FormData) {
			options.contentType = false;
			options.processData = false;
		} else if (options.contentType) {
			options.processData = false;

			if (options.contentType == "application/json")
				options.data = JSON.stringify(options.data);
		}

		var jqxhr = $.ajax(options);
		var promise = deferred.promise();

		promise.abort = function() {
			jqxhr.abort();
		};

		return promise;
	}

	request.events = emitter;

	request.get = function(url, data, options) {
		return request("GET", url, data, options);
	};

	request.post = function(url, data, options) {
		return request("POST", url, data, options);
	};

	request.del = function(url, data, options) {
		return request("DELETE", url, data, options);
	};

	request.text = function(url) {
		return request("GET", url, null, {dataType: "text"});
	};

	return request;
});
