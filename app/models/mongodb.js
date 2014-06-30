var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId,
	//Model = require("brisk").getClass("main");
	brisk = require("brisk"),
	Model = brisk.getBaseModel("model");

var model = Model.extend({

	options: {
		archive: false, // set to true to enable soft-delete
		delKey: "_archive", //
		timestamps: {
			updated: "updated",
			created: "created"
		}
	},

	backend: false,

	init: function( site ){

		// prerequisite
		if( !this.backend ) return;
		var Model = new Schema( this.schema() );
		// create the model
		this.db = this.db || site.modules.db.model(this.backend, Model);

	},

	schema: function(){
		return {

		}
	},


	sync: function(req, res) {
	},

	create: function( data, callback ) {
		// fallbacks
		callback = callback || function(){};
		// variables
		var self = this;
		// if not 'real' deleting add the 'archive' flag
		if( this.options.archive ){
			data[this.options.delKey] = 0;
		}
		if( this.options.timestamps ){
			data[this.options.timestamps.created] = now();
			data[this.options.timestamps.updated] = now();
		}
		var attributes = this.attributes( data );

		this.db.call("PutAttributes", attributes, function( err, result ){
			if (err) return callback(err);
			var response = self.parse( result );
			// error control
			callback( null, response );
		});
	},

	read: function( data, callback, options ) {
		// fallbacks
		options = options || {};
		callback = callback || function(){};
		// variables
		var self = this;

		this.db.find(data, function(err, result) {
			if (err) return callback(err);
			var response = self.parse( result );
			// convert to an array if returning a single object (for no id)
			//if ( response && (typeof data.id == "undefined") && !(response instanceof Array) ){
			//	response = [response];
			//}
			callback( null, response );
		});

	},

	update: function( data, callback ) {
		// fallback for no callback
		callback = callback || function(){};
		// variables
		var self = this;
		// don't execute with no specified id...
		//if( typeof data.id == "undefined" ) callback({ error: "No object id specified" });
		if( this.options.timestamps ){
			data[this.options.timestamps.updated] = now();
		}

		this.db.update(data, function( err, result ){
			if (err) return callback(err);
			var response = self.parse( result );
			// error control
			callback( null, response );
		});

	},

	"delete": function( data, callback, options ) {
		// fallbacks
		options = options || {};
		callback = callback || function(){};
		// variables
		var self = this;
		// if deleting is not allowed forward to archiving
		var archive = options.archive || this.options.archive;
		if( archive ) return this.archive( data, callback );
		// don't execute with no specified id...
		//if( typeof data.id == "undefined" ) callback({ error: "No object id specified" });

		this.db.destroy(data, function( err, result ){
			if (err) return callback(err);
			var response = self.parse( result );
			// error control
			//...
			// return a standard success response
			callback( null, { success: true });
		});

	},

	parse: function( data ) {

		// return empty if there are no results
		if( typeof data["Item"] == "undefined"){
			return false;
		}

		if( data instanceof Array ){

			// deconstruct the response to an array
			var collection = [];

			for( i in data ){

				var model = data[i];
				model = this.filter( model );
				//
				collection.push(model);

			}

		} else {

			var model = data;
			// filter model
			model = this.filter( data );
		}

		// check if we have a model or collection returned
		return collection || model;

	},

	// remove certain (internal) keys when reading
	filter: function( data ){
		// remove the archive flag
		try{
			delete data[this.options.delKey];
		} catch( e ){};
		//...
		return data;
	},

	// mongoDB compatibility
	find: function( data, callback, options ) {
		// only look into the entries that are not archived...
		if( this.options.archive ){
			data[this.options.delKey] = 0;
		}
		this.db.find( data, callback );
	},

	findOne: function( data, callback ) {
		// only look into the entries that are not archived...
		if( this.options.archive ){
			data[this.options.delKey] = 0;
		}
		this.db.findOne( data, callback );

	},

	all: function( callback ) {

		this.read( false, callback );

	},

	// delete objects regardless of "soft" delete option...
	destroy: function( data, callback ){

		this.delete( data, callback, { archive: false });
	},

	// count the number of items (optionally with conditions)
	count: function( data, callback, options ) {
		// fallbacks
		options = options || {};
		data = data || {};
		// variables
		var self = this;
		// only look into the entries that are not archived...
		if( this.options.archive || !options.archived ){
			data[this.options.delKey] = 0;
		}

		this.db.count( data, function(err, result) {
			if (err) return callback(err);
			var response = result;
			//
			var count = response.Count || false;
			callback( null, response );
		});
	},

	// sets an archive flag for "deleted" items
	archive: function( data, callback, options ) {
		// fallbacks
		options = options || {}; // , ex... { $set: { updated : "timestamp" } }
		callback = callback || function(){};
		// variables
		var self = this;
		// don't execute with no specified id...
		//if( typeof data.id == "undefined" ) callback({ error: "No object id specified" });
		//
		// set the data
		data[this.options.delKey] = 1;
		if( this.options.timestamps ){
			data[this.options.timestamps.updated] = now();
		}
		var attributes = this.attributes( data, { replace : true });

		this.db.update(data, function( err, result ){
			if (err) return callback(err);
			var response = self.parse( result );
			// error control
			//...
			// return a standard success response
			callback( null, { success: true });
		});

	}

});

// Helpers

function now(){
	// make sure this is calculates miliseconds? (13 chars)
	return (new Date()).getTime();
}


module.exports = model;