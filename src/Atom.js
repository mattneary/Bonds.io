var Atom = function(label, ve, charge) {
  this.charge = charge || 0;
  this.name = label+(charge?(charge>0?"+"+charge:"_"+Math.abs(charge)):"");
  this.element = label;
  this.number = ve;  
};
Atom.prototype = {
  renderCharge: function() {
    var prefix = this.charge > 0 ? String.fromCharCode(0x207A) : String.fromCharCode(0x207B),
      number = this.charge > 0 ? this.charge : -1*this.charge;
    var superscripts = [0, 0xb9, 0xb2, 0xb3].map(function(code) {
      return code ? prefix+String.fromCharCode(code) : "";
    });
    return superscripts[number];
  },
  parseName: function(name) {
    var superscripts = [0, 0xb9, 0xb2, 0xb3].map(function(code) {
      return code ? String.fromCharCode(0x207A)+String.fromCharCode(code) : "";
    });
    var chargeMatch = name.match(/[+_][0-9]/);
    var element = name.match(/^[a-zA-Z]+/)[0],
      number = name.match(/#[0-9]/)[0].substr(1)-0,
      chargeNum = chargeMatch ? parseInt(chargeMatch[0][1]) : 0,
      charge = chargeMatch ? chargeMatch[0][0]=="_"?-1*chargeNum:chargeNum : 0;

    return new Atom(element, number, charge);
  },
  renderInfo: function(centerLevel, subMolIndex, atomIndex) {
    if( !charge ) return this.element+",#"+this.number+","+centerLevel+","+subMolIndex+","+atomIndex;
    var charge = this.charge > 0 ? "+"+this.charge : "_"+Math.abs(this.charge);
    return this.element+charge+",#"+this.number+","+centerLevel+","+subMolIndex+","+atomIndex;
  }
};

try {
module.exports = Atom;
} catch(err) {}

