#!/usr/bin/env bash
# pack.sh <checkout> <label>
# Pack @c15t/tanstack-start and every public workspace package it reaches
# (harness closure.mjs) with `bun pm pack --ignore-scripts`. The checkout
# must already be built (turbo build --filter='@c15t/tanstack-start...').
# Writes packs-<label>/, packs-<label>.tsv, .head and .diff.
set -euo pipefail
T=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/tanstack
H=/home/kaylee/.t3/scratch/lcp-fleet/harness
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CHECKOUT="$1"; LABEL="$2"
P="$T/packs-$LABEL"; rm -rf "$P" "$P.tmp"; mkdir -p "$P" "$P.tmp"
: >"$T/packs-$LABEL.tsv"
for entry in $(node "$H/lib/closure.mjs" "$CHECKOUT" @c15t/tanstack-start); do
	name="${entry%%=*}"; dir="${entry#*=}"
	[[ -d "$dir/dist" ]] || { echo "$name not built ($dir/dist missing)" >&2; exit 1; }
	(cd "$dir" && bun pm pack --ignore-scripts --destination "$P.tmp" --quiet >/dev/null)
	tgz="$(ls -t "$P.tmp"/*.tgz | head -1)"
	if tar -xOf "$tgz" package/package.json | grep -q '"workspace:'; then echo "workspace range in $name" >&2; exit 1; fi
	hash="$(sha256sum "$tgz" | cut -c1-12)"; safe="$(echo "$name" | tr -d @ | tr / -)"
	mv "$tgz" "$P/$safe-$hash.tgz"
	printf '%s\t%s\t%s\n' "$name" "$P/$safe-$hash.tgz" "$(stat -c %s "$P/$safe-$hash.tgz")" >>"$T/packs-$LABEL.tsv"
done
rm -rf "$P.tmp"
git -C "$CHECKOUT" rev-parse HEAD >"$T/packs-$LABEL.head"
git -C "$CHECKOUT" diff HEAD >"$T/packs-$LABEL.diff"
cat "$T/packs-$LABEL.tsv"
