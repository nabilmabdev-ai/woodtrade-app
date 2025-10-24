import os

print("--- Starting Unused Code Cleaner Script (v2) ---")

# This dictionary maps each file to a list of specific text replacements.
# The format is (text_to_find, text_to_replace_with).
fixes = {
    "src/app/api/billing/credit-notes/route.ts": [
        (", Role", "")
    ],
    "src/app/api/billing/invoices/route.ts": [
        (", Role", "")
    ],
    "src/app/api/billing/payments/route.ts": [
        (", Role", "")
    ],
    "src/app/api/billing/reconciliation/route.ts": [
        (", Role", "")
    ],
    "src/app/api/cash-register-sessions/route.ts": [
        (", Role", ""),
        # ✅ Proper escaping of curly braces inside f-string
        (f"import {{ {{ createRouteHandlerClient }} }} from '@supabase/auth-helpers-nextjs';{os.linesep}", ""),
        (f"import {{ {{ cookies }} }} from 'next/headers';{os.linesep}", "")
    ],
    "src/app/api/cash-registers/route.ts": [
        (", Role", "")
    ],
    "src/app/api/cash-registers/[id]/close-session/route.ts": [
        (", Role", "")
    ],
    "src/app/api/cash-registers/[id]/movements/route.ts": [
        (", Role", "")
    ],
    "src/app/api/inventory/adjust/route.ts": [
        (f"import {{ {{ createRouteHandlerClient }} }} from '@supabase/auth-helpers-nextjs';{os.linesep}", ""),
        (f"import {{ {{ cookies }} }} from 'next/headers';{os.linesep}", ""),
        (f"import {{ {{ Role }} }} from '@prisma/client';{os.linesep}", ""),
        ("const user = await authorize", "await authorize")
    ],
    "src/app/api/users/route.ts": [
        (", Role", ""),
        (f"  const supabase = createRouteHandlerClient({{ {{ cookies }} }});{os.linesep}", "")
    ]
}

project_root = os.getcwd()
files_modified_count = 0
total_changes_count = 0

for relative_path, replacements in fixes.items():
    full_path = os.path.normpath(os.path.join(project_root, relative_path))
    
    try:
        with open(full_path, 'r', encoding='utf-8', newline='') as file:
            content = file.read()

        original_content = content
        
        for find_text, replace_text in replacements:
            if find_text in content:
                content = content.replace(find_text, replace_text)
                total_changes_count += 1

        if content != original_content:
            with open(full_path, 'w', encoding='utf-8', newline='') as file:
                file.write(content)
            print(f"✅ Cleaned: {relative_path}")
            files_modified_count += 1
        else:
            print(f"☑️ No changes were needed for: {relative_path}")

    except FileNotFoundError:
        print(f"❌ Error: File not found at {full_path}")
    except Exception as e:
        print(f"🔥 An unexpected error occurred with {full_path}: {e}")

print("\n--- Script Finished ---")
print(f"Made {total_changes_count} changes across {files_modified_count} file(s).")
print("The unused code warnings should now be resolved.")
print("Remember to manually fix the remaining errors if you haven't already.")
