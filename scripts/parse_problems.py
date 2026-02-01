import re
import json
import os

def parse_lines(lines):
    problems = []
    current_problem = {}
    state = None
    
    # Regex patterns
    problem_start_re = re.compile(r'^Problem (\d+):\s*(.+)')
    header_re = re.compile(r'^(Problem Statement|Statement|Sample Input|Sample Output|Test Cases):?', re.IGNORECASE)
    
    # Buffers
    desc_buffer = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('_'):
            continue

        # Check for new problem
        m = problem_start_re.match(line)
        if m:
            if current_problem:
                if desc_buffer:
                    current_problem['description'] = '\n'.join(desc_buffer).strip()
                problems.append(current_problem)
            
            p_id = int(m.group(1))
            title = m.group(2).strip()
            
            # Heuristic Difficulty
            diff = 'Easy'
            if p_id > 80: diff = 'Hard'
            elif p_id > 40: diff = 'Medium'
            
            # Heuristic Category
            cat = 'General'
            t_lower = title.lower()
            if 'array' in t_lower: cat = 'Arrays_&_Hashing'
            elif 'string' in t_lower: cat = 'String'
            elif 'pattern' in t_lower: cat = 'Patterns'
            elif 'recursion' in t_lower or 'factorial' in t_lower: cat = 'Recursion'
            elif 'thread' in t_lower or 'producer' in t_lower: cat = 'Multithreading'
            elif 'list' in t_lower or 'map' in t_lower or 'set' in t_lower: cat = 'Collections'
            elif 'class' in t_lower or 'object' in t_lower or 'inheritance' in t_lower or 'polymorphism' in t_lower: cat = 'OOP'
            elif 'search' in t_lower: cat = 'Searching'
            elif 'sort' in t_lower: cat = 'Sorting'
            
            current_problem = {
                'id': p_id,
                'title': title,
                'description': '',
                'difficulty': diff,
                'category': cat,
                'testCases': []
            }
            state = 'START'
            desc_buffer = []
            continue

        # Headers
        header_match = header_re.match(line)
        if header_match:
            header = header_match.group(1).lower()
            if 'statement' in header: state = 'DESC'
            elif 'input' in header and 'sample' in header: state = 'SAMPLE_IN'
            elif 'output' in header and 'sample' in header: state = 'SAMPLE_OUT'
            elif 'cases' in header: state = 'TESTS'
            continue

        # Content
        if state == 'DESC':
            desc_buffer.append(line)
        
        elif state == 'TESTS':
            # Ignore headers
            low = line.lower()
            if low.startswith('test case') or low.startswith('#') or low == 'test cases:': continue
            
            parts = None
            # Delimiters: Arrow '→', Tab '\t'
            if '→' in line:
                # Format: "1. input → output"
                # Remove leading numbering "1. " or "1 "
                clean = re.sub(r'^\d+[\.\t\s]+', '', line)
                if '→' in clean:
                    parts = [x.strip() for x in clean.split('→')]
            elif '\t' in line:
                 # Format: ID \t Input \t Output
                 tabs = [x.strip() for x in line.split('\t') if x.strip()]
                 if len(tabs) >= 3:
                     # ID, Input, Output
                     parts = [tabs[1], tabs[-1]]
                 elif len(tabs) == 2:
                     # ID, Output? OR Input, Output?
                     # If first is numeric ID, assume ID, Output? No, assume Input, Output
                     # But check if [0] is just a number
                     if tabs[0].isdigit() and len(tabs[0]) < 4: 
                         # Likely ID
                         pass 
                     else:
                         parts = tabs
            
            if parts and len(parts) >= 2:
                inp = parts[0]
                out = parts[-1]
                
                # Cleanup
                if inp in ['—', '""', '" "']: inp = ""
                # De-quote
                if inp.startswith('"') and inp.endswith('"'): inp = inp[1:-1]
                if out.startswith('"') and out.endswith('"'): out = out[1:-1]
                
                current_problem['testCases'].append({'input': inp, 'output': out})


    # Last one
    if current_problem:
        if desc_buffer:
            current_problem['description'] = '\n'.join(desc_buffer).strip()
        problems.append(current_problem)

    return problems

if __name__ == '__main__':
    base_dir = os.path.dirname(__file__)
    files = ['raw_problems.txt', 'raw_part2.txt', 'raw_part3.txt']
    
    all_lines = []
    print("Reading files...")
    for fname in files:
        fpath = os.path.join(base_dir, fname)
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    all_lines.extend(f.readlines())
                if all_lines and not all_lines[-1].endswith('\n'):
                    all_lines.append('\n')
                print(f"Read {fname}")
            except Exception as e:
                print(f"Error reading {fname}: {e}")
        else:
            print(f"File not found: {fname}")

    print(f"Total lines: {len(all_lines)}")
    data = parse_lines(all_lines)
    
    out_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'problems.json')
    try:
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Successfully processed {len(data)} problems.")
    except Exception as e:
        print(f"Error saving json: {e}")
