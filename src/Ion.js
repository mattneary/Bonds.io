var Ion = function (name) {
  this.name = name;
};
Ion.prototype = {
  removeCharge: function() {
    return this.name.replace(/[+_][0-9]/, "");
  },
  addCharge: function(charge) {
    return this.name.replace(/([A-Z][a-z]?)([_+][0-9])*?,/, "$1"+charge+",");
  }
};
try {
module.exports = Ion;
} catch(err) {}

