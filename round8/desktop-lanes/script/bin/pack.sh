#!/usr/bin/env bash
# pack.sh <checkout> <label>: pack @c15t/browser and its workspace closure from
# an already-built <checkout> (harness closure.mjs, bun pm pack --ignore-scripts).
# Writes packs/<label>/ and packs/<label>.tsv, .head, .diff.
set -euo pipefail
S=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/script
H=/home/kaylee/.t3/scratch/lcp-fleet/harness
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CHECKOUT="$1"; LABEL="$2"
P="$S/packs/$LABEL"; rm -rf "$P" "$P.tmp"; mkdir -p "$P" "$P.tmp"
: >"$S/packs/$LABEL.tsv"
for entry in $(node "$H/lib/closure.mjs" "$CHECKOUT" @c15t/browser); do
	name="${entry%%=*}"; dir="${entry#*=}"
	(cd "$dir" && bun pm pack --ignore-scripts --destination "$P.tmp" --quiet >/dev/null)
	tgz="$(ls -t "$P.tmp"/*.tgz | head -1)"
	if tar -xOf "$tgz" package/package.json | grep -q '"workspace:'; then echo "workspace range in $name" >&2; exit 1; fi
	hash="$(sha256sum "$tgz" | cut -c1-12)"; safe="$(echo "$name" | tr -d @ | tr / -)"
	mv "$tgz" "$P/$safe-$hash.tgz"
	printf '%s\t%s\t%s\n' "$name" "$P/$safe-$hash.tgz" "$(stat -c %s "$P/$safe-$hash.tgz")" >>"$S/packs/$LABEL.tsv"
done
rm -rf "$P.tmp"
git -C "$CHECKOUT" rev-parse HEAD >"$S/packs/$LABEL.head"
git -C "$CHECKOUT" diff HEAD >"$S/packs/$LABEL.diff"
cat "$S/packs/$LABEL.tsv"
