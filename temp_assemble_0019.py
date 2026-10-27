import os

parts = [
    'part_0019a.sql',
    'part_0019b1.sql',
    'part_0019b2.sql',
    'part_0019c.sql',
]

out_path = 'F:/coding/bora codes/v1/official_bora_page/supabase/migrations/0019_bora_engine_full_window_readiness.sql'
with open(out_path, 'w', encoding='utf-8') as out:
    for part in parts:
        with open('F:/coding/bora codes/v1/official_bora_page/supabase/migrations/' + part, 'r', encoding='utf-8') as f:
            out.write(f.read())
            out.write('\n')

print('assembled:', out_path)
