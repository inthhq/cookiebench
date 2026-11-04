# judge.py <run-dir>: prints the gate verdict line, then an info line.
import json, subprocess, sys
L = '/home/kaylee/.t3/scratch/lcp-fleet/frameworks/sveltekit'
try:
    out = subprocess.run(['python3', '-I', L + '/bin/table.py', sys.argv[1]], capture_output=True, text=True, check=True).stdout
    r = json.loads(out)
except Exception as error:  # noqa: BLE001
    print(f'DISCARD: judge error {type(error).__name__}')
    print('-')
    sys.exit(0)
print(r.get('gate') or 'DISCARD: no envelope')
print('ctrl_fcp={} load_max={} passed={} ctrl_passed={} lcp_delta={}'.format(
    r.get('ctrl_fcp'), r.get('load_max'), r.get('passed'), r.get('ctrl_passed'), r.get('lcp_delta')))
