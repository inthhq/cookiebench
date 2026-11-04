#!/usr/bin/env bash
# pack.sh <checkout>: pack @c15t/astro's dependency closure (optional peers
# @c15t/react and @c15t/vue left out: the fixture uses ui: "svelte") with
# `bun pm pack --ignore-scripts`, write packs.tsv, packs.head, packs.diff.
set -euo pipefail
A=/home/kaylee/.t3/scratch/lcp-fleet/frameworks/astro
H=/home/kaylee/.t3/scratch/lcp-fleet/harness
source /home/kaylee/.t3/scratch/lcp-fleet/competitors/env.sh
CHECKOUT="$1"
P="$A/packs"; rm -rf "$P" "$P.tmp"; mkdir -p "$P" "$P.tmp"
: >"$A/packs.tsv"
for entry in $(node "$H/lib/closure.mjs" "$CHECKOUT" @c15t/astro); do
	name="${entry%%=*}"; dir="${entry#*=}"
	case "$name" in @c15t/react | @c15t/vue) continue ;; esac
	(cd "$dir" && bun pm pack --ignore-scripts --destination "$P.tmp" --quiet >/dev/null)
	tgz="$(ls -t "$P.tmp"/*.tgz | head -1)"
	if tar -xOf "$tgz" package/package.json | grep -q '"workspace:'; then echo "workspace range in $name" >&2; exit 1; fi
	if [[ $(tar -tzf "$tgz" | grep -c '^package/dist/') -eq 0 ]]; then echo "no dist/ in $name" >&2; exit 1; fi
	hash="$(sha256sum "$tgz" | cut -c1-12)"; safe="$(echo "$name" | tr -d @ | tr / -)"
	mv "$tgz" "$P/$safe-$hash.tgz"
	printf '%s\t%s\t%s\n' "$name" "$P/$safe-$hash.tgz" "$(stat -c %s "$P/$safe-$hash.tgz")" >>"$A/packs.tsv"
done
rm -rf "$P.tmp"
git -C "$CHECKOUT" rev-parse HEAD >"$A/packs.head"
git -C "$CHECKOUT" status --short >"$A/packs.status"
git -C "$CHECKOUT" diff HEAD >"$A/packs.diff"
cat "$A/packs.tsv"
