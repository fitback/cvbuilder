#!/bin/bash
# ResumeMatcher E2E Smoke Test — covers all critical paths
# Usage: npm run smoke  (requires backend on localhost:3001)

API=${API_URL:-http://localhost:3001}
PASS=0
FAIL=0
TOKEN=""

green() { echo -e "\033[32m$1\033[0m"; }
red() { echo -e "\033[31m$1\033[0m"; }

check() {
  local label="$1" code="$2" expect="$3"
  if echo "$code" | grep -q "$expect"; then
    ((PASS++)); green "  ✅ $label"
  else
    ((FAIL++)); red "  ❌ $label (got: $code)"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ResumeMatcher Smoke Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Auth ───
echo ""
echo "▶ Auth"

# Register
R=$(curl -s -X POST "$API/auth/register" -H "Content-Type: application/json" -d '{"phone":"19900000001","password":"smoke123"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('token','FAIL'))" 2>/dev/null)
check "POST /auth/register" "$R" "eyJ"

# Login
TOKEN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"phone":"19900000001","password":"smoke123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
check "POST /auth/login" "$TOKEN" "eyJ"

# Me
ME=$(curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('phone',''))")
check "GET /auth/me" "$ME" "199"

# ─── 2. Permissions ───
echo ""
echo "▶ Permissions"

# Auth required
R=$(curl -s -o /dev/null -w "%{http_code}" "$API/resumes")
check "GET /resumes (no auth)" "$R" "401"

# Admin required
R=$(curl -s -o /dev/null -w "%{http_code}" "$API/recharges/all" -H "Authorization: Bearer $TOKEN")
check "GET /recharges/all (non-admin)" "$R" "401"

# ─── 3. Points ───
echo ""
echo "▶ Points"

BAL=$(curl -s "$API/points/balance" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['balance'])")
check "Initial balance = 50" "$BAL" "50"

# ─── 4. Jobs CRUD ───
echo ""
echo "▶ Jobs"

JDID=$(curl -s -X POST "$API/jobs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"Smoke Test JD","company":"TestCo","content":"3+ years React, TypeScript, Node.js experience"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('id',''))")
check "POST /jobs (create JD)" "$JDID" "-"

# List JDs
JDS=$(curl -s "$API/jobs" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d.get('data',[])))")
check "GET /jobs (list)" "$JDS" "[1-9]"

# ─── 5. File Upload ───
echo ""
echo "▶ File Upload"

# Create a test DOCX (minimal valid DOCX)
TMPDIR=$(mktemp -d)
printf 'PK\x03\x04\x00\x00\x00\x00\x00\x00test' > "$TMPDIR/test.docx"

# Upload (should work)
R=$(curl -s -X POST "$API/resumes/upload" -H "Authorization: Bearer $TOKEN" -F "file=@$TMPDIR/test.docx;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('resumeId','FAIL'))")
check "POST /resumes/upload (DOCX)" "$R" "-"

# Bad upload: empty file
printf '' > "$TMPDIR/empty.pdf"
R=$(curl -s -X POST "$API/resumes/upload" -H "Authorization: Bearer $TOKEN" -F "file=@$TMPDIR/empty.pdf;type=application/pdf" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error',{}).get('code','ok'))")
check "Upload empty file rejected" "$R" "FILE"

# Bad upload: wrong format
printf 'not a real file' > "$TMPDIR/fake.txt"
R=$(curl -s -X POST "$API/resumes/upload" -H "Authorization: Bearer $TOKEN" -F "file=@$TMPDIR/fake.txt;type=text/plain" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error',{}).get('code','ok'))")
check "Upload .txt rejected" "$R" "FILE"

rm -rf "$TMPDIR"

# ─── 6. Recharge ───
echo ""
echo "▶ Recharge"

# Invalid recharge amount
R=$(curl -s -X POST "$API/recharges/orders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"amount":15}' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error',{}).get('code','ok'))")
check "Recharge invalid plan (15)" "$R" "INVALID"

# ─── 7. Health ───
echo ""
echo "▶ Health"

R=$(curl -s "$API/health" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('status','FAIL'))")
check "GET /health" "$R" "ok|degraded"

# ─── 8. Export ───
echo ""
echo "▶ Export"

MD="# Test\n## Section\n- Item 1\n- Item 2\n\nContent here with **bold** text. Enough content to pass the 50 character minimum check."

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/export/pdf" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"markdown\":\"$MD\"}")
check "POST /export/pdf" "$R" "201"

R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/export/docx" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"markdown\":\"$MD\"}")
check "POST /export/docx" "$R" "201"

# ─── 9. Rate Limiting ───
echo ""
echo "▶ Rate Limiting"

# Rapid register should be throttled
LASTCODE=""
for i in $(seq 1 7); do
  LASTCODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/register" -H "Content-Type: application/json" -d "{\"phone\":\"1991111111$i\",\"password\":\"test\"}")
done
check "Rate limit register (7 in <1min)" "$LASTCODE" "429"

# ─── Results ───
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
