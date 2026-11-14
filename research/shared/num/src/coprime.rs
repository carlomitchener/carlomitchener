use mrly_error::{Result, value_error};

pub const GASKET_LEVELS: u32 = 32;

fn odd_coprime(mut a: u64, mut b: u64) -> bool {
    while a != b {
        if a > b {
            a -= b;
            a >>= a.trailing_zeros();
        } else {
            b -= a;
            b >>= b.trailing_zeros();
        }
    }
    a == 1
}

pub fn gasket(level: u32) -> Result<u64> {
    if level > GASKET_LEVELS {
        return value_error(format!(
            "level {level} is past the {GASKET_LEVELS} the gasket count reaches."
        ));
    }
    let mut count = 0u64;
    let mut m = 1u64;
    while m < 1u64 << level {
        let rest = m - 1;
        let mut sub = rest;
        loop {
            if odd_coprime(sub + 1, m) {
                count += 1;
            }
            if sub == 0 {
                break;
            }
            sub = (sub - 1) & rest;
        }
        m += 2;
    }
    Ok(2 * count)
}
