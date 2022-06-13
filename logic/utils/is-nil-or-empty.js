const _ = require("lodash");

function isNilOrEmpty(obj){
	return _.isNil(obj) || _.isEmpty(obj);
}

module.exports = isNilOrEmpty