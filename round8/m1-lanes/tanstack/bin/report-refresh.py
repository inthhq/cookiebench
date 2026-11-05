#!/usr/bin/env python3
"""report-refresh.py: rewrite the auto:tables and auto:ledger blocks of the report from table.py (python3 -I)."""
import re, subprocess
p = '/Users/kayleewilliams/.t3/scratch/lcp-fleet/reports/frameworks-tanstack.md'
tab = subprocess.run(['python3', '-I', '/Users/kayleewilliams/.t3/scratch/lcp-fleet/frameworks/tanstack/bin/table.py'], capture_output=True, text=True, check=True).stdout
tables, led = tab.split('### Ledger')
s = open(p).read()
s = re.sub(r'<!-- auto:tables -->[\s\S]*?<!-- /auto:tables -->', lambda m: '<!-- auto:tables -->\n' + tables.strip() + '\n<!-- /auto:tables -->', s)
s = re.sub(r'<!-- auto:ledger -->[\s\S]*?<!-- /auto:ledger -->', lambda m: '<!-- auto:ledger -->\n' + led.strip() + '\n<!-- /auto:ledger -->', s)
open(p, 'w').write(s)
