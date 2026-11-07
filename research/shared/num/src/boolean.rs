pub fn walsh_spectrum(code: u128, n: usize) -> Vec<i64> {
    let size = 1usize << n;
    let mut t: Vec<i64> = (0..size)
        .map(|x| if (code >> x) & 1 == 1 { -1 } else { 1 })
        .collect();
    let mut len = 1;
    while len < size {
        let mut i = 0;
        while i < size {
            for j in i..i + len {
                let a = t[j];
                let b = t[j + len];
                t[j] = a + b;
                t[j + len] = a - b;
            }
            i += len << 1;
        }
        len <<= 1;
    }
    t
}

pub fn nonlinearity(code: u128, n: usize) -> i64 {
    if n == 0 {
        return 0;
    }
    let max_w = walsh_spectrum(code, n)
        .into_iter()
        .map(|w| w.abs())
        .max()
        .unwrap_or(0);
    (1i64 << (n - 1)) - max_w / 2
}

pub fn is_balanced(code: u128, n: usize) -> bool {
    let size = 1u32 << n;
    (code & ((1u128 << size) - 1)).count_ones() == size / 2
}

pub fn sac(code: u128, n: usize) -> f64 {
    if n == 0 {
        return 0.0;
    }
    let size = 1usize << n;
    let mut total = 0.0;
    for bit in 0..n {
        let mut flips = 0usize;
        for x in 0..size {
            let f = (code >> x) & 1;
            let g = (code >> (x ^ (1 << bit))) & 1;
            if f != g {
                flips += 1;
            }
        }
        total += flips as f64 / size as f64;
    }
    total / n as f64
}
