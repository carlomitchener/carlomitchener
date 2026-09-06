# COMMANDS

- The console. Python 3.13, the aws CLI through subprocess, no boto3.
- Every verb prints a PLAN first. Nothing mutates without `--yes`.
- Run from the desk: `uv run python carlomitchener/aws/<file>.py <verb> [--yes]`.
- Ids come from `Developer/.env`. A verb that learns one appends it, never overwrites.

## COMMON

- `common.py` is imported, not run.
- Paths, env, the aws shell, say/verdict/gate/verb, resolvers.
- Apex carlomitchener.com. Bucket `CARLOMITCHENER_BUCKET`. Origin path `/site`.
- It refuses the mrly.net zone and any `MRLYNET_*` value.

## SITE

- `check` reads everything and prints GO or HOLD per line. Read-only.
- `zone` finds the Route53 zone, creates it only if absent, saves `CARLOMITCHENER_ZONE`.
- `cert` requests the us-east-1 cert for apex and www, DNS validation, waits ISSUED.
- `cert` saves `CARLOMITCHENER_CERT`.
- `bucket` blocks public access, suspends versioning, drops any website config.
- `bucket` then seals the bucket to the distribution. Run it again after `distribution`.
- `function` publishes the `carlomitchener-router` CloudFront function.
- Router: www 301s to apex, a slash appends index.html, extensionless 301s to a slash.
- `headers` writes `carlomitchener-security`: hsts, nosniff, referrer, CSP.
- `distribution` creates or updates it, saves `CARLOMITCHENER_OAC` and `CARLOMITCHENER_ID`.
- `records` points apex and www A and AAAA aliases at the distribution.

## IAM

- `check` prints the caller, the role, its trust, its inline policy and the attached one.
- `role` creates or updates `carlomitchener-role` and saves `ROLE_ARN`.
- Trusts lambda and scheduler.
- Grants logs, S3 on the one bucket, `lambda:InvokeFunction` on `carlomitchener-*`.

## LAYERS

- `build <name>` uv pip installs pillow or numpy for aarch64-manylinux2014 into `data/layers/`.
- `build` proves one `.so` is aarch64, then zips it with `python/` at the zip root.
- `publish <name>` uploads the zip as a layer version and saves `PILLOW_LAYER_ARN` or `NUMPY_LAYER_ARN`.
- `list` prints the latest version of each layer and whether its arn is in `.env`.
- `probe` creates a throwaway function, prints the three versions, deletes itself.

## FN

- `list` prints each function in the registry with its state, memory and timeout.
- `package <fn>` zips `shop/handler.py`, `shop/automator/` and the seven `mrlypy/` packages.
- `deploy <fn>` packages, creates or updates code and configuration, then the guards.
- Guards: 0 retries, reserved concurrency 1, log retention 14 days, JSON logs at INFO.
- The automator runs python3.13 arm64, 4096 MB, 180 s, 512 MB storage, handler `handler.handler`.
- Its env is eight keys: the bucket, the Printful key, five Shopify keys, `SITE_URL`.
- `invoke <fn>` runs one tick and prints the tail log. `config <fn>` prints it without the env.
- `logs <fn>` tails the last 20 minutes.

## SCHEDULES

- `list` prints each schedule with its state and rate.
- `sync <name>` creates or updates `carlomitchener-automator` at `rate(5 minutes)`, window OFF.
- `sync` reads the live schedule first and keeps its State: a schedule is born DISABLED.
- `enable <name>` and `disable <name>` flip the State and leave everything else alone.
- The target is the Lambda through `ROLE_ARN`, retries 0, event age 60 s.

## ORDER

- 2 Console: `iam.py role`, then `shop/shopify.py publications` (Online Store and Headless).
- 3 Domain: zone, cert, bucket, function, headers, distribution, bucket, records, check.
- The second `bucket` is not optional: the policy names the distribution.
- CloudFront takes about three minutes to deploy. Poll, do not rerun.
- Proof: `curl -I https://carlomitchener.com/` is 200 with the headers, www 301s to apex.
- 5 Automator: `layers.py build`, `publish`, `probe`, `fn.py deploy automator`, `manager.py init`.
- Then `fn.py invoke automator`: CREATE, GENERATE, MOCKUP in one tick, then Retry.
- Shop verbs run from `shop/`: `uv run --directory shop python -m manager <verb> --yes`.
- 7 Loop: `schedules.py sync automator`, then `enable`. `disable` stops the machine.
