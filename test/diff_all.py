import os
import difflib
import sys

# Configuration
ORIGINAL_DIR = "output"
NEW_DIR = "new"
MAX_DIFFS = 0  # 0 = no limit

def diff_files(original_path, generated_path):
    """Returns True if differences are found, False otherwise."""
    if not os.path.exists(original_path) or not os.path.exists(generated_path):
        print(f"ERROR: File missing. Orig: {original_path} or New: {generated_path}")
        return True

    with open(original_path, 'r', encoding='utf-8') as f_orig, \
         open(generated_path, 'r', encoding='utf-8') as f_gen:
        orig_lines = f_orig.readlines()
        gen_lines = f_gen.readlines()

    diff = list(difflib.unified_diff(
        orig_lines, 
        gen_lines, 
        fromfile='Original', 
        tofile='Generated', 
        lineterm=''
    ))

    if not diff:
        print("[OK] PERFECT MATCH: Files are 100% identical.")
        return False
    else:
        print("[DIFF] DIFFERENCES FOUND:\n")
        for line in diff:
            print(line)
        return True

def main():
    if not os.path.exists(ORIGINAL_DIR) or not os.path.exists(NEW_DIR):
        print(f"ERROR: Ensure both '{ORIGINAL_DIR}/' and '{NEW_DIR}/' folders exist.")
        sys.exit(1)

    print("Starting batch diff of .inc files...")
    print("-" * 70)

    # Get sorted list of .inc files, excluding path-dependent ones
    inc_files = sorted([f for f in os.listdir(ORIGINAL_DIR) if f.endswith('.inc')])
    
    diff_count = 0

    for filename in inc_files:
        print(f"\n[ FILE: {filename} ]")
        
        orig_path = os.path.join(ORIGINAL_DIR, filename)
        new_path = os.path.join(NEW_DIR, filename)

        if diff_files(orig_path, new_path):
            diff_count += 1
        
        print("-" * 70)

        if MAX_DIFFS > 0 and diff_count >= MAX_DIFFS:
            print(f"\n[STOP] Reached limit of {MAX_DIFFS} files with differences.")
            break

    if diff_count == 0:
        print("\n=== ALL FILES MATCH PERFECTLY ===")
    else:
        print(f"\nFinished. Total files with differences found: {diff_count}")

if __name__ == "__main__":
    main()
