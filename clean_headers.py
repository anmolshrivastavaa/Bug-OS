import sys

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
i = 0

while i < len(lines):
    # Detect start of duplicate header
    if '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap:16px;">' in lines[i]:
        # Peek ahead to see if it contains buildUserRing
        has_ring = False
        end_idx = i
        for j in range(i, min(i+40, len(lines))):
            if 'buildUserRing()' in lines[j]:
                has_ring = True
            # we count divs to find the matching closing div?
            # actually it ends after buildUserRing() followed by two </div>
            if has_ring and '</div>' in lines[j]:
                # find the third </div> after buildUserRing
                pass
        
        if has_ring:
            # Skip lines until we find buildUserRing() + 3 closing divs
            j = i
            while j < len(lines) and 'buildUserRing()' not in lines[j]:
                j += 1
            # now find 2 more </div> lines
            divs_found = 0
            while j < len(lines) and divs_found < 3:
                j += 1
                if '</div>' in lines[j]:
                    divs_found += 1
            i = j + 1
            continue
            
    new_lines.append(lines[i])
    i += 1

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleaned headers.")
