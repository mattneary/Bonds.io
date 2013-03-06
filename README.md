Introduction
============
Bonds.io is a website that draws bond diagrams of provided molecules. I recently rewrote the algorithm to be much more maintainable, thus this version has not yet been published to the webpage.

Usage
=====
Include `bonds.js`, make a new `Formula` based on a string, construct a `Molecule` from the response of `Formula#atoms`, call `Molecule#solve` and make a `Tree` of that solution. Then call `Tree#draw`. For example

```javascript
var formula = new Formula("C6H12");
var molecule = new Molecule(formula.atoms());

var solve;
molecule.solve(function(solution) {
	solve = solution;
});

var tree = new Tree(solve);			
tree.draw(canvas.getContext('2d'));
```