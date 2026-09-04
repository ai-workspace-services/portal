#!/bin/bash
# secret-incident.sh - Helper script for handling gitleaks incidents
# Usage: ./scripts/security/secret-incident.sh

REPORT_FILE=".git/gitleaks/report.json"
CONFIG_FILE="config/gitleaks.toml"

echo "========================================"
echo "🛡️  Git Secret Incident Response Helper"
echo "========================================"

if [ ! -f "$REPORT_FILE" ]; then
    echo "✅ No active report found at $REPORT_FILE."
    echo "Running gitleaks to check for issues..."
    ./scripts/hooks/run-gitleaks.sh full
    if [ $? -eq 0 ]; then
        echo "No secrets detected. You are safe."
        exit 0
    fi
fi

echo ""
echo "⚠️  Secrets detected! parsing report..."
echo ""

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install it to parse JSON reports."
    # Fallback to simple cat
    cat "$REPORT_FILE"
    exit 1
fi

# Summary
COUNT=$(jq length "$REPORT_FILE")
echo "Found $COUNT potential secret(s)."

# List items
jq -r '.[] | "----------------------------------------\nType: \(.Description)\nFile: \(.File)\nLine: \(.StartLine)\nCommit: \(.Commit)\nSecret: \(.Secret | .[0:4])..."' "$REPORT_FILE"

echo "----------------------------------------"
echo ""
echo "Select an action:"
echo "1) 🩹 Fix: I will remove the secret and rotate it (Standard Procedure)"
echo "2) 🧹 History: I pushed it and need to clean git history (Dangerous)"
echo "3) ✅ Allow: This is a false positive (Add to whitelist)"
echo "4) ❌ Exit"

read -p "Enter choice [1-4]: " CHOICE

case "$CHOICE" in
    1)
        echo ""
        echo ">>> ACTION: FIX & ROTATE"
        echo "1. Revoke the exposed secret IMMEDIATELY."
        echo "2. Remove the secret from the file."
        echo "3. Run 'git restore --staged <file>' if it was just staged."
        echo "4. Verify with './scripts/hooks/run-gitleaks.sh staged'"
        ;;
    2)
        echo ""
        echo ">>> ACTION: CLEAN HISTORY"
        echo "WARNING: This rewrites history. Notify your team!"
        echo ""
        echo "Recommended command (install git-filter-repo first):"
        echo "git filter-repo --path <path/to/file> --invert-paths --force"
        echo ""
        echo "Then force push:"
        echo "git push --force --all"
        ;;
    3)
        echo ""
        echo ">>> ACTION: ALLOWLIST"
        echo "Editing $CONFIG_FILE..."
        echo "Add the file path or regex to the [[allowlist]] section."
        echo ""
        echo "Example path:"
        echo "paths = ['''path/to/false/positive.file''']"
        echo ""
        echo "Opening config file..."
        # Try to open with default editor
        ${EDITOR:-nano} "$CONFIG_FILE"
        ;;
    4)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid choice."
        ;;
esac

echo ""
echo "Playbooks:"
echo "  Rotation and access governance:"
echo "    xworkspace-core-skills: operations-management/secrets-identity-and-access-governance"
echo "  Git history cleanup:"
echo "    skills/git-history-secret-remediation/SKILL.md"
echo "  Incident declaration and tracking:"
echo "    xworkspace-core-skills: operations-management/incident-response-and-change-management"
