"""
Fix non-breaking space characters in Python files
"""

filepath = r'app\models\fertilizer\deficiency_detection.py'

# Read file in binary mode
with open(filepath, 'rb') as f:
    content = f.read()

# Replace non-breaking space (U+00A0, UTF-8: C2 A0) with regular space
fixed_content = content.replace(b'\xc2\xa0', b' ')

# Also try replacing as unicode
text = fixed_content.decode('utf-8')
text = text.replace('\u00a0', ' ')  # Non-breaking space
text = text.replace('\u202f', ' ')  # Narrow non-breaking space
text = text.replace('\u2007', ' ')  # Figure space
text = text.replace('\u2060', '')   # Word joiner

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"✅ Fixed non-printable characters in {filepath}")
