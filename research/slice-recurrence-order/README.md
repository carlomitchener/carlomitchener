# Menger Diagonal Slices: A Recurrence of Order $\lceil D/2 \rceil$

Slice a Menger sponge along its main diagonal, count the cubes the cut meets, and repeat in every dimension. The counts are not arbitrary: each one is decided by the few before it. A carry automaton with a contraction and a reflection shows that in dimension $D$ only $\lceil D/2 \rceil$ previous terms are ever needed - about a quarter of the $2D+1$ that the standard construction hands you for free. At $D = 3$ the machine returns the published spectrum of the hexagon-triangle substitution without ever seeing a hexagon.

![How many past terms the diagonal slice census needs: the free bound 2D+1 against the proved order ceil(D/2), for dimensions 2 through 14.](figures/order.svg)

Keep the cells of the base-3 grid whose digit vector has at most one coordinate equal to the middle digit $1$; that is the $D$-dimensional Menger analog. Let $a_D(L)$ count the cells of its level-$L$ approximation that meet the central diagonal hyperplane $\sum_i x_i = D(3^L-1)/2$.

**Theorem.** For every $D \ge 2$, $a_D(L)$ satisfies a linear recurrence with constant integer coefficients of order at most $\lceil D/2 \rceil$, namely the one given by the characteristic polynomial of the $\lceil D/2 \rceil \times \lceil D/2 \rceil$ carry matrix $M_{\mathrm{even}}^{(D)}$.

**Theorem.** At every odd $D$ with $D \not\equiv 1 \pmod 3$, the dominant root $\rho_D$ of that polynomial sits strictly above $f_D/3 = 2^{D-1}(D+2)/3$: the counting exponent of the slice exceeds the solid's dimension minus one. The engine is an exact product formula, $b_D(L) = 3^{-L} \sum_m \prod_j (2\cos\theta_{m,j})^{D-1}(D + 2\cos\theta_{m,j})$ over the 3-adic angle towers $\theta_{m,j} = 2\pi m 3^j/3^L$, whose every term ends in the parity factor $(-1)^{D-1}(D-1)$; at odd $D$ the integrand is pointwise nonnegative and the census cannot fall below $(f_D/3)^L$. The even half of the sign law, and the residue class $D \equiv 1 \pmod 3$ beyond $D = 80$, remained conjectural when this paper was written, and it records exactly why the even side is harder. The even half has since been proved, at base 3 and base 5, in [slice-sign-even-half](../slice-sign-even-half/); the residue class is still open.

**Theorem.** Unconditionally, $|\rho_D - f_D/3| \le 2(D-1)/3$: the slice exponent converges to the generic Marstrand-Mattila value $\log_3 f_D - 1$ in every dimension, and only the side of the approach is still open. Exactly, $3\rho_D = f_D + (-1)^{D-1}(D-1)(3p_D-1)$ with $p_D$ the Perron carry vector's mass on carries divisible by 3, so the entire sign law is the parity-free statement $p_D > 1/3$.

The proof is three moves: the digit polynomial factors as $P_D(t) = (1+t^2)^{D-1}(1+Dt+t^2)$, the carry map $c \mapsto (c+D-s)/3$ contracts onto $\{|c| \le \lfloor (D-1)/2 \rfloor\}$, and the palindromic symmetry $P_D[s] = P_D[2D-s]$ halves that set. Exactness of the order is verified, not proved: the exact rational Hankel determinant is nonzero for $2 \le D \le 24$, starting $2, 72, -6336, -1029600000, -62272025640000$. The script re-derives the $D = 3$ matrix $[[6,6],[1,3]]$, its polynomial $\lambda^2 - 9\lambda + 12$, and the census $1, 6, 42, 306, 2250, 16578, 122202$ - which is [A299916](https://oeis.org/A299916) - along with the $D = 4$ ladder $6, 132, 1848, 29040, 441408, 6772128$ and the traces $3 \cdot 2^{D-2} - 1$ and $3D \cdot 2^{D-3}$.

- [paper.pdf](paper.pdf) - the paper.
- `tectonic paper.tex` rebuilds it; `python3 scripts/verify.py` re-checks every number; `python3 scripts/figure.py` redraws the bars.
