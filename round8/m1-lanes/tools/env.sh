# Source this in every lane shell: Node 24.21.0, private Bun 1.3.11, pnpm 11.25.0.
export LCP=/Users/kayleewilliams/.t3/scratch/lcp-fleet
export PATH="/Users/kayleewilliams/.local/share/fnm/node-versions/v24.21.0/installation/bin:$LCP/tools/bun/bin:$LCP/tools/pnpm/node_modules/.bin:$PATH"
export BUN_INSTALL="$LCP/tools/bun"
export CB="$LCP/cookiebench"
export NEXT_TELEMETRY_DISABLED=1 ASTRO_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1
export TMPDIR=/tmp   # the runner locks $TMPDIR/cookiebench-v3-measurement.lock; all lanes must share it
