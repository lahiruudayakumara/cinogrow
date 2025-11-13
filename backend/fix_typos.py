"""
Fix common Python magic method typos in the codebase
"""
import os

def fix_file(filepath):
    """Fix typos in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix logging.getLogger typo
        content = content.replace('logging.getLogger(_name_)', 'logging.getLogger(__name__)')
        
        # Fix __init__ typo
        content = content.replace('def _init_(', 'def __init__(')
        
        # Fix super().__init__() typo
        content = content.replace('super()._init_()', 'super().__init__()')
        
        # Fix __main__ typo
        content = content.replace('if _name_ == "_main_":', 'if __name__ == "__main__":')
        
        # Fix type(e).__name__ typo
        content = content.replace('type(e)._name_', 'type(e).__name__')
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {filepath}")
            return True
        else:
            print(f"⏭ No changes needed: {filepath}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {filepath}: {e}")
        return False

# List of files to fix
files_to_fix = [
    r'app\services\cinnamon_dataset_trainer.py',
    r'app\services\cinnamon_deficiency_detector.py',
    r'app\routers\simple_features.py',
    r'app\routers\fertilizer\cinnamon_analysis.py',
    r'app\routers\fertilizer\enhanced_cinnamon_api.py'
]

print("Starting typo fixes...\n")
fixed_count = 0

for filepath in files_to_fix:
    if fix_file(filepath):
        fixed_count += 1

print(f"\n{'='*50}")
print(f"✅ Fixed {fixed_count} out of {len(files_to_fix)} files")
print(f"{'='*50}")
