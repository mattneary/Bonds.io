Note: Bonds.io has been moved to the BWHS.me organization.

Introduction
============
Bonds.io is a website that draws bond diagrams of provided molecules. It is currently tested to work with covalent bonds, including huge organic molecules like `C6H12O6` and circular structures like `SO3`.

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

Roadmap
=======
- Make circles *always* clear (cf. CO3).
- Fix handling of ionic bonds with metals & recognition of charges in this case (cf. MnO4).
- Implement bonding between polyatomic ions.
- Add machine learning to save time in the recursive solving process.