# Base-3 Digit Designs: Diagonality, Ray Masses, and a Spectral Gap at Two

Write two numbers in base three at once, stacked, so each digit position carries a pair from the nine possibilities; keep three of those nine pairs and forbid the rest. You get a self-similar cloud of points in the plane. Now ask the simplest question available: which straight lines through the origin hit the cloud, and how many points does each line catch? Some designs pile everything onto a few lines. Others spread every single point onto a line of its own, and it turns out you can tell which is which by looking at one digit.

![Two base-3 digit designs at level 3: the gasket piles points onto lines, a diagonal design gives every point its own ray.](figures/rays.svg)

A design is a three-element set $F \subseteq \{0,1,2\}^2$, and its level-$n$ points are $\sum_{i<n} 3^i d_i$ with every $d_i \in F$. Two families appear here and they are different objects: the gasket $G = \{(0,0),(1,0),(0,1)\}$, and the permutation designs $F_\phi = \{(0,\phi(0)),(1,\phi(1)),(2,\phi(2))\}$ for a permutation $\phi$ of $\{0,1,2\}$. Call $F$ *diagonal* when no two distinct nonzero points of any level are collinear with the origin.

**Theorem.** $F_\phi$ is diagonal if and only if $\phi(0) \neq 0$ — four of the six permutations. For those four and every $n \ge 1$, the $3^n$ points occupy $3^n$ distinct rays, exactly two of them the coordinate axes, so the number of occupied non-fibre rays is $Z_{F_\phi}(n) = 3^n - 2$.

The proof is six lines: every permutation of $\{0,1,2\}$ is affine over the field of three elements, and after one cancellation the cross determinant of two points whose digits first differ at position $k$ comes out congruent to $3^k \phi(0)(d_k - d_k')$, which is nonzero exactly when $\phi(0)$ is. Two more laws ride along, checked rather than proved. Gasket ray masses obey exact recurrences: $M_n(3,1) = F(n+1) - 1$, $M_n(1,12) = A000930(n) - 1$, $M_n(7,3) = c(n-3) - 1$ with $c(0..3) = 1,2,3,4$ and $c(m) = c(m-1) + c(m-4)$, all exact for $n \le 30$. And over all 829 coprime pairs with $\max(s,t) \le 52$, the growth rate of $\{z : z, sz, tz \in G_n\}$ is $3$ on the three shift pairs, exactly $2$ on twenty pairs, at most $1.6956207696$ on the rest, and never in between.

- [paper.pdf](paper.pdf) - the paper.
- `tectonic paper.tex` rebuilds it; `python3 scripts/verify.py` re-checks every number in about two seconds; `python3 scripts/figure.py` redraws the two panels.
