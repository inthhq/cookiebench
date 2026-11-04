#!/usr/bin/env bash
# pack-head.sh <checkout> <label>: build @c15t/vue and its workspace deps in
# <checkout>, pack that closure (harness closure.mjs, bun pm pack
# --ignore-scripts), write packs-<label>.tsv.
set -euo pipefail
N=/home/kaylee/.t3/scratch/lcp-fleet/nuxt
H=/home/kaylee/.t3/scratch/lcp-fleet/harness
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CHECKOUT="$1"; LABEL="$2"
(cd "$CHECKOUT" && bun run turbo run build --filter='@c15t/vue...' --concurrency=2 --output-logs=errors-only) >"$N/build-$LABEL.log" 2>&1 || { tail -40 "$N/build-$LABEL.log"; exit 1; }
P="$N/packs-$LABEL"; rm -rf "$P" "$P.tmp"; mkdir -p "$P" "$P.tmp"
: >"$N/packs-$LABEL.tsv"
for entry in $(node "$H/lib/closure.mjs" "$CHECKOUT" @c15t/vue); do
	name="${entry%%=*}"; dir="${entry#*=}"
	(cd "$dir" && bun pm pack --ignore-scripts --destination "$P.tmp" --quiet >/dev/null)
	tgz="$(ls -t "$P.tmp"/*.tgz | head -1)"
	if tar -xOf "$tgz" package/package.json | grep -q '"workspace:'; then echo "workspace range in $name" >&2; exit 1; fi
	hash="$(sha256sum "$tgz" | cut -c1-12)"; safe="$(echo "$name" | tr -d @ | tr / -)"
	mv "$tgz" "$P/$safe-$hash.tgz"
	printf '%s\t%s\t%s\n' "$name" "$P/$safe-$hash.tgz" "$(stat -c %s "$P/$safe-$hash.tgz")" >>"$N/packs-$LABEL.tsv"
done
rm -rf "$P.tmp"
git -C "$CHECKOUT" rev-parse HEAD >"$N/packs-$LABEL.head"
git -C "$CHECKOUT" diff HEAD >"$N/packs-$LABEL.diff"
cat "$N/packs-$LABEL.tsv"
