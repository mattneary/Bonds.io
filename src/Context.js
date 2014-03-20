var Context = function() {
  // useless class used that allows tests to be run...
  // ... without a canvas element
  var context = this;
  var fns = ["moveTo", "lineTo", "arc", "beginPath", "closePath", "stroke", "fill", "fillText"];
  fns.forEach(function(fn) {
    context[fn] = function(){};
  });
};
try {
module.exports = Context;
} catch(err) {}

