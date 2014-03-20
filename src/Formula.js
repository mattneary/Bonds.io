var Atom = needs("Atom");
var Formula = function(formula) {
  // Relate element name to valence electron number. Note that...
  // ... Hydrogen is considered to have 7 for convenience's sake.
  var elements = [
    ["H", "He"],
    ["Li", "Be", "B", "C", "N", "O", "F", "Ne"],
    ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"],
    ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
    ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
    ["Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"]];
  var ve = [
    [7,                                                                     8],
    [1,2,                                                         3,4,5,6,7,8],
    [1,2,                                                         3,4,5,6,7,8],
    [1,2, 2,2,2, 2,2,2, 2,2,2, 2,                                 3,4,5,6,7,8],
    [1,2, 2,2,2, 2,2,2, 2,2,2, 2,                                 3,4,5,6,7,8],
    [1,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 2,2,2, 3,4,5,6,7,8]];
  
  var atoms = {};
  elements.forEach(function(row, i) {
    row.forEach(function(elm, j) {
      var number = ve[i][j];
      atoms[elm] = number >= 4 ? new Atom(elm, number) : new Atom(elm, 8-number, number);
    });
  });
  this.namedAtom = atoms;  
  this.formula = formula;  
};
Formula.prototype = {
  repeat: function(x, n) {
    return list(n).map(constant(x));
  },
  atoms: function() {
    // Match element names and subscripts and repeat elements...
    // ... based on their subscripts.
    var formula = this;
    var parts = this.formula.match(/[A-Z][a-z]?([0-9]+)?/g),
      atoms = parts.map(function(elm) {
        var nums = elm.match(/[0-9]+/),
          number = nums?parseInt(nums[0]):1;
        return formula.repeat(elm.match(/[A-Z][a-z]?/)[0], number);
      }).reduce(concat);
    return atoms.map(function(elm) { return formula.namedAtom[elm]; });
  }
};
try {
module.exports = Formula;
} catch(err) {}

