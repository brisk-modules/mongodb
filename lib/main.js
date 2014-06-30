var Module = require("brisk").getHelper("module");

var Main = Module.extend({
	dir : __dirname,
	model: require("../app/models/mongodb")
});


module.exports = new Main();