define([
   	"./lib/EventEmitter",
	"./lib/extend",
    "./lib/find",
	"./Collection",
    "./Model",
	"./Source",
	"./View",
    "jquery",
    "jquery-ui"
], function(EventEmitter, extend, find, Collection, Model, Source, View, $){

	function List(e, collection, options) {
        if (!collection)
            collection = new Collection();

		this.e = e;
		this.$e = $(e);
		this.items = [];
		this.index = {};
		this.length = 0;
		this.options = options || {};
		this.pk = this.options.pk || collection.options.pk || "id";
		this.selection = [];
        this.selectionSequence = [];
        this.selectedIds = this.options.selectedIds || [];

		if (!this.options.of)
			this.options.of = this.options.of || View;

		if (this.options.selection === true) {
			this.options.selection = 1;
		} else if (!this.options.selection) {
			this.e.classList.add("no-selection");
		}

        if (this.options.sortable) {
            this.$e.find(".items").sortable({
                update: this.handleSort.bind(this)
            });
        }

		this.itemContainer = this.e.querySelector(this.options.itemContainer || ".items");
		this.itemTemplate = this.e.querySelector(this.options.itemTemplate || ".item");

		if (!this.itemContainer)
			return console.error("List", e, "does not contain an item container");

		if (!this.itemTemplate)
			return console.error("List", e, "does not contain an item template");

		this.itemTemplate.parentNode.removeChild(this.itemTemplate);
		this.e.classList.add(this.options.readyClass || "ready");

		this.delegateSelection();
        this.delegateItemDeletion();

		if (collection instanceof Collection) {
			this.reset(collection);
		} else if (collection instanceof Source) {
			this.reset(new Collection({source: collection}));
		}
	}

	List.prototype = {

		add: function(model) {
			if (model[this.pk] in this.index) {
				this.remove(this.index[model[this.pk]]);
			}

			var item = new this.options.of(this.itemTemplate, model, this.options.item);
			this.items.push(item);
			this.index[model[this.pk]] = item;

            if (this.isSelected(model)) {
                this.markAsSelected(item);
            } else if (this.selectedIds.indexOf(model[this.pk]) > -1) {
                this.select(item);
            }

            item.afterGenerate = function() {
                if (this.isSelected(model))
                    this.markAsSelected(item);
            }.bind(this);

			this.checkEmptiness();
			this.itemContainer.appendChild(item.e);
            this.settle("after-add");

			return item;
		},

		bind: function(collection) {
			if (this.collection) {
				this.collection.off("add", this._add);
				this.collection.off("remove", this._remove);
				this.collection.off("sort", this._sort);

                if (this._source_loading) {
                    this.collection.off("source-loading", this._source_loading);
                    this.collection.off("source-complete", this._source_complete);
                }
			}

			this.collection = collection;
			this.collection.on("add", this._add = function(item){
				if (!this._ignore_add)
					this.add(item);
			}.bind(this));
			this.collection.on("remove", this._remove = this.remove.bind(this));
			this.collection.on("sort", this._sort = this.sort.bind(this));

            if (collection.source) {
                this.collection.on("source-loading", this._source_loading = function(){
                    this.setLoading(true);
                }.bind(this));
                this.collection.on("source-complete", this._source_complete = function(){
                    this.setLoading(false);
                }.bind(this));
            }
		},

		checkEmptiness: function() {
			this.length = this.items.length;

			if (this.length) {
				this.e.classList.remove("empty");
			} else {
				this.e.classList.add("empty");
			}
		},

        checkSelection: function() {
            if (this.selection.length) {
                this.e.classList.add("has-active-selection");
            } else {
                this.e.classList.remove("has-active-selection");
                var check = this.e.querySelector(".list-global-check input");
                if (check && check.checked) check.checked = false;
            }
        },

        delegateItem: function(events) {
            for (var key in events) {
				var stuff = key.split(/\s+/);
				var event = stuff[0];
				var selector = stuff.length == 2 ? ".item " + stuff[1] : ".item";
				var callback = typeof events[key] == "function" ? events[key] : this[events[key]];
                (function(event, selector, callback){
                    this.$e.on(event, selector, function(e){
                        var itemElement = find(e.target, ".item");
                        var item = this.getItemByElement(itemElement);
                        callback.call(item, e.originalEvent);
                    }.bind(this));
                }).call(this, event, selector, callback);
			}
        },

        delegateItemDeletion: function() {
            var self = this;
            this.delegateItem({
                "click .item-delete": function(e) {
                    if (this.model instanceof Model) {
                        this.model.del();
                    } else {
                        self.collection.remove(this.model);
                    }
                }
            });
        },

		delegateSelection: function() {
			if (this.options.selection) {
				var self = this;
                this.$e.on("change", ".list-global-check", function(e){
                    var checkbox = this.querySelector("input[type='checkbox']");
                    if (checkbox) {
                        if (!self.items.length) {
                            e.preventDefault();
                            return;
                        }

                        if (e.target !== checkbox)
                            checkbox.checked = !checkbox.checked;

                        if (checkbox.checked) {
                            self.select(self.items);
                        } else {
                            self.unselect(self.items);
                        }
                    }
                });
                this.$e.on("click", ".list-item-check", function(e){
                    self.toggleSelection(find(this, ".item"));
                    e.stopImmediatePropagation();
                });
				this.$e.on("click", ".item", function(e){
                    if ($(e.target).closest(".mute-click, .list-item-check").length) return;

					self.toggleSelection(this, e.shiftKey);
                    e.stopPropagation();
				});
                this.$e.on("click", ".list-selection-actions [data-action]", function(e){
                    self.emitSelectionAction(this.dataset.action);
                });
			}
		},

        emitSelectionAction: function(action) {
            if (this.selection.length)
                this.emit("selection:" + action, this.getSelectedItems(), this.getSelectedModels());
        },

		getItemByElement: function(e) {
            for (var i = 0, it = this.items, l = it.length; i < l; i++)
                if (it[i].e === e)
                    return it[i];
		},

        getItemById: function(id) {
            return this.index[id];
        },

        getItemByModel: function(model) {
            for (var i = 0, it = this.items, l = it.length; i < l; i++)
                if (it[i].model === model)
                    return it[i];
        },

        getSelectedItems: function() {
            return this.selection.slice();
        },

        getSelectedModels: function() {
            return this.selection.map(function(i){
                return i.model;
            });
        },

        getSelectedIds: function() {
            var pk = this.pk;
            return this.selection.map(function(i){
                return i.model[pk];
            });
        },

        handleSort: function(e, ui) {
            var item = this.getItemByElement(ui.item[0]);
            var position = ui.item.index();
            this.collection.move(item.model, position);
            this.emit("item-moved", item, position);
        },

        isSelected: function(item) {
            if (item instanceof View) {
                return this.selection.indexOf(item) > -1;
            } else if (item instanceof Element) {
                return this.isSelected(this.getItemByElement(item));
            } else if (item) {
                return this.isSelected(this.getItemByModel(item));
            }
        },

        markAsSelected: function(item) {
            item.e.classList.add("selected");
            var checkbox = item.e.querySelector(".list-item-check input[type='checkbox']");
            if (checkbox)
                checkbox.checked = true;
        },

		remove: function(model) {
			var item = this.index[model[this.pk]];
			if (item)
				this.removeItem(item);
		},

		removeItem: function(item) {
			var index = this.items.indexOf(item);
            var sindex = this.selection.indexOf(item);
            if (index != -1) {
            	if (item.e.parentNode)
    				this.itemContainer.removeChild(item.e);
    			this.items.splice(index, 1);
                if (sindex != -1)
                    this.selection.splice(sindex, 1);
    			delete this.index[item.model[this.pk]];
    			this.checkEmptiness();
                this.checkSelection();
    			item.dispose();
                this.settle("after-remove");
            }
		},

		reset: function(collection) {
			if (Array.isArray(collection))
				collection = new Collection({items: collection});

			while (this.items.length)
				this.removeItem(this.items[0]);

			this.selection = [];
			this.bind(collection);
			this._ignore_add = true;
			this.collection.getAll(function(items){
                items.forEach(this.add.bind(this));
    			this.checkEmptiness();
                this.checkSelection();
                this.emit("sort");
				this._ignore_add = false;
            }.bind(this));
		},

		select: function(item, selectRange) {
			if (item instanceof View) {
                if (selectRange) {
                    var endIndex = this.items.indexOf(item) + 1;
                    var firstSelectedItem = this.items.slice(0, endIndex).filter(function(item){
                        return this.isSelected(item);
                    }.bind(this))[0];
                    var startIndex = firstSelectedItem ? this.items.indexOf(firstSelectedItem) : 0;
                    this.select(this.items.slice(startIndex, endIndex));
                } else {
    				if (!this.isSelected(item)) {
    					this.selection.push(item);
                        this.selection.sort(function(a, b){
                            return this.items.indexOf(a) - this.items.indexOf(b);
                        }.bind(this));
                        this.selectionSequence.push(item);
    					this.markAsSelected(item);

    					if (this.selection.length > this.options.selection)
    						this.unselect(this.selectionSequence[0]);
    				}
                    this.checkSelection();
    				this.emit("select", item);
                    this.emit("change-selection");
                }
			} else if (item instanceof Element) {
				this.select(this.getItemByElement(item));
			} else if (Array.isArray(item)) {
				item.forEach(function(item){
                    this.select(item);
                }.bind(this));
			} else if (typeof item == "number") {
				if (item < this.items.length && item >= 0)
					this.select(this.items[item]);
			} else if (item) {
                this.select(this.getItemByModel(item));
            }
		},

        selectByIds: function(ids) {
            for (var i = 0, l = ids.length; i < l; i++)
                this.select(this.getItemById(ids[i]));
        },

        setLoading: function(loading) {
            if (loading) {
                this.e.classList.add("loading");
            } else {
                this.e.classList.remove("loading");
            }
        },

        settle: function(event) {
            clearTimeout(this._changeTID);
            this._changeTID = setTimeout(function(){
                this.emit(event);
            }.bind(this), 0);
        },

        sort: function() {
            var last;
            this.collection.items.forEach(function(model){
                var item = this.index[model[this.pk]];
				if (item) {
	                if (last && item.e.previousSibling !== last.e) {
	                    this.itemContainer.insertBefore(item.e, last.e.nextSibling);
	                } else if (!last) {
	                    this.itemContainer.appendChild(item.e);
	                }
	                if (this.isSelected(item))
	                    this.markAsSelected(item);
	                last = item;
				}
            }.bind(this));
            this.emit("sort");
        },

        toggleSelection: function(item, selectRange) {
            if (item instanceof View) {
                if (this.isSelected(item)) {
                    this.unselect(item);
                } else {
                    this.select(item, selectRange);
                }
            } else if (item instanceof Element) {
				this.toggleSelection(this.getItemByElement(item), selectRange);
			} else if (Array.isArray(item)) {
				item.forEach(function(item){
                    this.toggleSelection(item);
                }.bind(this));
			} else if (typeof item == "number") {
				if (item < this.items.length && item >= 0)
					this.toggleSelection(this.items[item], selectRange);
			} else if (item) {
                this.toggleSelection(this.getItemByModel(item));
            }
        },

		unselect: function(item) {
			if (item instanceof View) {
				var index = this.selection.indexOf(item);
                var sequenceIndex = this.selectionSequence.indexOf(item);
                var selectedIdIndex = this.selectedIds.indexOf(item.model[this.pk]);

				if (index != -1) {
					this.selection.splice(index, 1);
                    this.selectionSequence.splice(sequenceIndex, 1);
                    this.selectedIds.splice(selectedIdIndex, 1);

					item.e.classList.remove("selected");

                    var checkbox = item.e.querySelector(".list-item-check input[type='checkbox']");
                    if (checkbox)
                        checkbox.checked = false;

                    this.checkSelection();
					this.emit("unselect", item);
                    this.emit("change-selection", item);
				}
			} else if (item instanceof Element) {
				this.unselect(this.getItemByElement(item));
			} else if (Array.isArray(item)) {
				item.forEach(this.unselect.bind(this));
			} else if (item) {
                this.unselect(this.getItemByModel(item));
            }
		}
	};

	extend(List, EventEmitter);

	return List;
});
