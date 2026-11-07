use std::panic::catch_unwind;
use std::process::exit;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;
use std::time::Instant;

pub type Witness = (&'static str, fn());

pub fn dispatch(table: &[Witness]) {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("witness") {
        exit(run(table, &args[1..]));
    }
}

pub fn run(table: &[Witness], names: &[String]) -> i32 {
    if names.is_empty() {
        for (name, _) in table {
            println!("{name}");
        }
        return 0;
    }
    let all = names.iter().any(|name| name == "all");
    let known = |name: &String| name == "all" || table.iter().any(|(held, _)| held == name);
    if let Some(unknown) = names.iter().find(|name| !known(name)) {
        eprintln!("no witness named {unknown}");
        return 2;
    }
    let chosen: Vec<&Witness> = table
        .iter()
        .filter(|(name, _)| all || names.iter().any(|asked| asked == name))
        .collect();
    let width = chosen.iter().map(|(name, _)| name.len()).max().unwrap_or(0);
    let next = AtomicUsize::new(0);
    let failed = AtomicUsize::new(0);
    let workers = thread::available_parallelism()
        .map_or(1, |count| count.get())
        .min(chosen.len());
    thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| {
                while let Some((name, proof)) = chosen.get(next.fetch_add(1, Ordering::Relaxed)) {
                    let start = Instant::now();
                    let held = catch_unwind(*proof).is_ok();
                    if !held {
                        failed.fetch_add(1, Ordering::Relaxed);
                    }
                    println!(
                        "{} {name:width$} {:.2}s",
                        if held { "ok  " } else { "FAIL" },
                        start.elapsed().as_secs_f64()
                    );
                }
            });
        }
    });
    let failed = failed.into_inner();
    println!("{} witnesses, {failed} failed", chosen.len());
    i32::from(failed > 0)
}
