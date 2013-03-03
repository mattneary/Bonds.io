exports.assert = function(assertion, fn) {
	var resp = fn();
	if( resp !== true ) {
		console.error("Assertion failed: ", assertion, JSON.stringify(resp));
	} else {
		console.log("Assertion Passed");
	}
};