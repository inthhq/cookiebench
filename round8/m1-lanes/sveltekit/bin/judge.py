# judge.py <run-dir>: prints the gate verdict line, then an info line.
import json, os, subprocess, sys
L = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/sveltekit'
run = sys.argv[1]
meta = open(os.path.join(run, 'meta.txt')).read() if os.path.exists(os.path.join(run, 'meta.txt')) else ''
try:
    out = subprocess.run(['python3', '-I', L + '/bin/table.py', run], capture_output=True, text=True, check=True).stdout
    r = json.loads(out)
except Exception as error:  # noqa: BLE001
    print(f'DISCARD: judge error {type(error).__name__}; {meta.strip().splitlines()[-1] if meta else ""}')
    print('-')
    sys.exit(0)
gate = r.get('gate') or 'DISCARD: no envelope'
if 'missing' in r:
    gate = 'DISCARD: no envelope (' + (meta.strip().splitlines()[-1] if meta else '?') + ')'
print(gate)
print('ctrl_fcp={} load_max={} passed={} ctrl_passed={} lcp_delta={} failures={}'.format(
    r.get('ctrl_fcp'), r.get('load_max'), r.get('passed'), r.get('ctrl_passed'), r.get('lcp_delta'), ','.join(r.get('failures') or []) or '-'))
