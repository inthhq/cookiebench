#!/usr/bin/env bash
# Measure the CookieBench mobile LCP cost of a c15t checkout on the
# with-c15t-nextjs fixture.
#
#   bench.sh <c15t-checkout> <port-base> [iterations]
#
# <port-base> is the fixture proxy port. Next listens on <port-base>+90
# (the fixture's own 4322/4412 pair has the same offset). Override with
# NEXT_PORT.
#
# Environment:
#   WORK_DIR        private work dir (default: $HARNESS/work/<port-base>)
#   WARMUPS         CookieBench warm-ups per arm (default 1)
#   SKIP_C15T_BUILD=1   reuse the checkout's existing dist/ output
#   SKIP_RUN=1      stop after next build (no measurement)
#   SKIP_WATERFALL=1    skip the Playwright waterfall
#   WATERFALL_VISITS    candidate visits for the waterfall (default 3)
#   BUILD_CONCURRENCY   turbo concurrency for the c15t build (default 4)
#   LABEL           name for the output dir (default: short HEAD sha)
#
# Output goes to $WORK_DIR/out/<label>-<timestamp>/.
set -euo pipefail

HARNESS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COOKIEBENCH_SRC="${COOKIEBENCH_SRC:-/home/kaylee/.t3/scratch/cookiebench}"

if [[ $# -lt 2 ]]; then
	sed -n '2,22p' "$0"
	exit 64
fi
CHECKOUT="$(cd "$1" && pwd)"
PROXY_PORT="$2"
ITERATIONS="${3:-15}"
NEXT_PORT="${NEXT_PORT:-$((PROXY_PORT + 90))}"
WARMUPS="${WARMUPS:-1}"
WORK_DIR="${WORK_DIR:-$HARNESS/work/$PROXY_PORT}"
WATERFALL_VISITS="${WATERFALL_VISITS:-3}"
BUILD_CONCURRENCY="${BUILD_CONCURRENCY:-4}"

if [[ "$PROXY_PORT" == 4322 || "$NEXT_PORT" == 4412 ]]; then
	echo "Refusing the shared fixture ports 4322/4412." >&2
	exit 64
fi
for p in "$PROXY_PORT" "$NEXT_PORT"; do
	if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then
		echo "Port $p is already in use." >&2
		exit 1
	fi
done
[[ -f "$CHECKOUT/packages/c15t/package.json" ]] || {
	echo "$CHECKOUT is not a c15t checkout" >&2
	exit 64
}

log() { printf '\n[bench %s] %s\n' "$(date +%H:%M:%S)" "$*" >&2; }

# ---------------------------------------------------------------- toolchain
# Bun 1.3.11 and pnpm 11.25.0, pinned by c15t and CookieBench. The system
# bun is newer and rejects c15t's frozen lockfile; ~/.local/bin/pnpm is not
# pnpm. Node 24: the c15t build (tcm -> yargs) fails on Node 26.
TOOLS="$HARNESS/tools"
(
	flock 9
	if [[ ! -x "$TOOLS/node_modules/.bin/pnpm" || ! -x "$TOOLS/node_modules/.bin/bun" ]]; then
		mkdir -p "$TOOLS"
		cat >"$TOOLS/package.json" <<-'EOF'
			{"private":true,"dependencies":{"bun":"1.3.11","pnpm":"11.25.0"},"trustedDependencies":["bun"]}
		EOF
		(cd "$TOOLS" && "$HOME/.bun/bin/bun" install)
	fi
) 9>"$HARNESS/.tools.lock"
NODE24_BIN="${NODE24_BIN:-}"
if [[ -z "$NODE24_BIN" ]]; then
	NODE24_BIN="$(cd "$COOKIEBENCH_SRC" && "$HOME/.nub/bin/nub" node which 2>/dev/null || true)"
fi
[[ -x "$NODE24_BIN" ]] || {
	echo "Set NODE24_BIN to a Node 24 binary" >&2
	exit 1
}
export PATH="$(dirname "$NODE24_BIN"):$TOOLS/node_modules/.bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
log "node $(node --version), bun $(bun --version), pnpm $(pnpm --version)"

mkdir -p "$WORK_DIR"
exec 8>"$WORK_DIR/.lock"
flock -n 8 || {
	echo "Another bench is using $WORK_DIR" >&2
	exit 1
}

SHA="$(git -C "$CHECKOUT" rev-parse --short=9 HEAD)"
DIRTY="$(git -C "$CHECKOUT" status --porcelain --untracked-files=no | wc -l)"
LABEL="${LABEL:-$SHA$([[ $DIRTY -gt 0 ]] && echo -dirty)}"
OUT="$WORK_DIR/out/$LABEL-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
{
	echo "checkout=$CHECKOUT"
	echo "head=$(git -C "$CHECKOUT" rev-parse HEAD)"
	echo "dirty_tracked_files=$DIRTY"
	echo "proxy_port=$PROXY_PORT next_port=$NEXT_PORT"
	echo "iterations=$ITERATIONS warmups=$WARMUPS"
} >"$OUT/meta.txt"
git -C "$CHECKOUT" diff HEAD >"$OUT/checkout.diff" || true

# ---------------------------------------------------------------- c15t build
if [[ "${SKIP_C15T_BUILD:-}" != 1 ]]; then
	if [[ ! -d "$CHECKOUT/node_modules" ]]; then
		log "bun install in $CHECKOUT"
		(cd "$CHECKOUT" && bun install --frozen-lockfile)
	fi
	log "turbo build --filter=c15t..."
	(cd "$CHECKOUT" && bun run turbo run build --filter='c15t...' \
		--concurrency="$BUILD_CONCURRENCY" --output-logs=errors-only) \
		>"$OUT/c15t-build.log" 2>&1 || {
		tail -40 "$OUT/c15t-build.log" >&2
		exit 1
	}
fi

# ---------------------------------------------------------------- pack
# c15t and every workspace package it reaches through dependencies,
# optionalDependencies or peerDependencies (the same walk CookieBench's
# source-build does). --ignore-scripts skips prepack, which regenerates
# tracked docs in the checkout; docs do not reach the page.
log "packing c15t closure"
PACKS="$WORK_DIR/packs"
rm -rf "$PACKS.tmp" "$PACKS" && mkdir -p "$PACKS.tmp" "$PACKS"
CLOSURE="$(node "$HARNESS/lib/closure.mjs" "$CHECKOUT" c15t)"
: >"$OUT/packs.tsv"
for entry in $CLOSURE; do
	name="${entry%%=*}"
	dir="${entry#*=}"
	(cd "$dir" && bun pm pack --ignore-scripts --destination "$PACKS.tmp" --quiet >/dev/null)
	tgz="$(ls -t "$PACKS.tmp"/*.tgz | head -1)"
	if tar -xOf "$tgz" package/package.json | grep -q '"workspace:'; then
		echo "Unresolved workspace range in $name" >&2
		exit 1
	fi
	hash="$(sha256sum "$tgz" | cut -c1-12)"
	safe="$(echo "$name" | tr -d @ | tr / -)"
	final="$PACKS/$safe-$hash.tgz"
	mv "$tgz" "$final"
	printf '%s\t%s\t%s\n' "$name" "$final" "$(stat -c %s "$final")" >>"$OUT/packs.tsv"
done
rm -rf "$PACKS.tmp"

# ---------------------------------------------------------------- consumer
# A private copy of the CookieBench workspace with only the Next fixture.
CB="$WORK_DIR/cookiebench"
FIX="$CB/benchmarks/with-c15t-nextjs"
log "syncing CookieBench workspace into $CB"
mkdir -p "$CB/benchmarks"
rsync -a --delete \
	--exclude node_modules --exclude .git --exclude results --exclude artifacts \
	--exclude .source-build --exclude '.turbo' --exclude '/benchmarks/' \
	"$COOKIEBENCH_SRC/" "$CB/"
for d in with-c15t-nextjs profiles; do
	rsync -a --delete --exclude node_modules --exclude .next \
		"$COOKIEBENCH_SRC/benchmarks/$d/" "$CB/benchmarks/$d/"
done

node "$HARNESS/lib/prepare-consumer.mjs" "$CB" "$OUT/packs.tsv" "$PROXY_PORT" "$NEXT_PORT"

log "pnpm install"
(cd "$CB" && pnpm install --no-frozen-lockfile --reporter=append-only) >"$OUT/pnpm-install.log" 2>&1 || {
	tail -40 "$OUT/pnpm-install.log" >&2
	exit 1
}
node "$HARNESS/lib/verify-install.mjs" "$FIX" "$OUT/packs.tsv" | tee "$OUT/installed.txt"

log "next build"
rm -rf "$FIX/.next"
(cd "$FIX" && pnpm run build) >"$OUT/next-build.log" 2>&1 || {
	tail -60 "$OUT/next-build.log" >&2
	exit 1
}
[[ "${SKIP_RUN:-}" == 1 ]] && {
	log "SKIP_RUN=1, built at $FIX"
	exit 0
}

# ---------------------------------------------------------------- CookieBench
CONFIG="$OUT/run.json"
node "$HARNESS/lib/make-config.mjs" "$FIX/run.json" "$CB/benchmarks/profiles/mobile.json" "$FIX" "$ITERATIONS" "$WARMUPS" >"$CONFIG"
log "cookiebench run: mobile-article-v1, load, $ITERATIONS pairs, $WARMUPS warm-up"
# The runner allows one measured workload per machine through
# $TMPDIR/cookiebench-v3-measurement.lock and exits at once when another
# holds it. Wait for our turn instead of failing. PRIVATE_LOCK=1 gives this
# run its own TMPDIR and so its own lock: it runs in parallel with other
# benches and their CPU load.
if [[ "${PRIVATE_LOCK:-}" == 1 ]]; then
	export TMPDIR="$WORK_DIR/tmp"
	mkdir -p "$TMPDIR"
fi
LOCK_WAIT_MIN="${LOCK_WAIT_MIN:-120}"
deadline=$(($(date +%s) + LOCK_WAIT_MIN * 60))
waited=0
while :; do
	set +e
	(cd "$CB" && node packages/cli/src/index.ts run --config "$CONFIG" --scenario load \
		--iterations "$ITERATIONS" --warmups "$WARMUPS" --output "$OUT/envelope.json") \
		>"$OUT/run.stdout.json" 2>"$OUT/run.stderr.log"
	RUN_STATUS=$?
	set -e
	if [[ $RUN_STATUS -ne 0 ]] && grep -q "Another measured workload is active" "$OUT/run.stdout.json" "$OUT/run.stderr.log" 2>/dev/null; then
		if (($(date +%s) > deadline)); then
			echo "Gave up after waiting ${LOCK_WAIT_MIN} min for the CookieBench measurement lock" >&2
			exit 1
		fi
		[[ $waited == 0 ]] && log "measurement lock held by another run ($(grep -oh 'PID [0-9]*' "$OUT/run.stdout.json" "$OUT/run.stderr.log" | head -1)); waiting"
		waited=1
		sleep 20
		continue
	fi
	break
done
if [[ ! -f "$OUT/envelope.json" ]]; then
	echo "cookiebench run failed ($RUN_STATUS)" >&2
	tail -40 "$OUT/run.stderr.log" >&2
	exit 1
fi
for metric in page.lcp page.fcp initial.transfer initial.requests; do
	(cd "$CB" && node packages/cli/src/index.ts compare --baseline "$OUT/envelope.json" \
		--candidate "$OUT/envelope.json" --metric "$metric") >"$OUT/compare-$metric.json" 2>>"$OUT/compare.stderr.log" || true
done

# ---------------------------------------------------------------- waterfall
if [[ "${SKIP_WATERFALL:-}" != 1 ]]; then
	log "waterfall: own Playwright script, $WATERFALL_VISITS candidate + control visits"
	node "$HARNESS/lib/waterfall.mjs" --cookiebench "$CB" --fixture "$FIX" \
		--proxy-port "$PROXY_PORT" --next-port "$NEXT_PORT" \
		--visits "$WATERFALL_VISITS" --out "$OUT" >"$OUT/waterfall.log" 2>&1 || {
		tail -30 "$OUT/waterfall.log" >&2
		echo "waterfall failed (CookieBench results are still in $OUT)" >&2
	}
fi

node "$HARNESS/lib/summarize.mjs" "$OUT" | tee "$OUT/summary.md"
log "done: $OUT"
exit "$RUN_STATUS"
