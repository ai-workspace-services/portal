#!/usr/bin/env bash
# 排版阶梯守卫。
#
# 任何绕过 :root 字号 token 的写法都会在此失败。规范见同目录 SKILL.md。
# 单跑：bash skills/ui-typography/scripts/check-type-scale.sh
# 已接入 `yarn lint`。
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${REPO_ROOT}"

SRC="src"
GLOBALS="src/app/globals.css"
fail=0

section() { printf '\n\033[1m%s\033[0m\n' "$1"; }
bad() { fail=1; printf '  \033[31m✗\033[0m %s\n' "$1"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }

# ---------------------------------------------------------------------------
# 1. Tailwind 任意字号：text-[13px] / text-[0.7rem] 之类
# ---------------------------------------------------------------------------
section "1. Tailwind 任意字号"
hits=$(grep -rn 'text-\[[0-9.]*\(px\|rem\|em\)\]' "${SRC}" \
        --include="*.ts" --include="*.tsx" --include="*.mdx" 2>/dev/null || true)
if [ -n "${hits}" ]; then
  bad "发现写死的字号 class，请改用阶梯 class（见 SKILL.md 对照表）："
  echo "${hits}" | sed 's/^/      /'
else
  ok "无"
fi

# ---------------------------------------------------------------------------
# 2. 内联 fontSize 数字字面量
# ---------------------------------------------------------------------------
section "2. 内联 fontSize 字面量"
hits=$(grep -rn 'fontSize: *[0-9]' "${SRC}" \
        --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "${hits}" ]; then
  bad "内联样式里出现数字字号，请改为 fontSize: \"var(--fs-…)\"："
  echo "${hits}" | sed 's/^/      /'
else
  ok "无"
fi

# ---------------------------------------------------------------------------
# 3. CSS 字面量 font-size
#    放行：var(--fs-…) / cqw（图形内部）/ em（等宽与行内代码）/ html 的 16px 根锚点
# ---------------------------------------------------------------------------
section "3. CSS 字面量 font-size"
# 先剥离 /* */ 块注释再匹配，否则注释里举的反例会被误判。
strip_comments() {
  python3 - "$1" <<'PYEOF'
import re, sys
path = sys.argv[1]
src = open(path, encoding="utf-8").read()
# 用等长空白替换注释，保持行号不变
def blank(m): return re.sub(r"[^\n]", " ", m.group(0))
for i, line in enumerate(re.sub(r"/\*.*?\*/", blank, src, flags=re.S).split("\n"), 1):
    print(f"{path}:{i}: {line}")
PYEOF
}
hits=$(for f in $(find "${SRC}" -name "*.css"); do strip_comments "$f"; done \
       | grep "font-size:" \
       | grep -v "var(--fs-" \
       | grep -v "cqw" \
       | grep -v -E "font-size: *[0-9.]+em" \
       | grep -v -E "^${GLOBALS}:[0-9]+: *font-size: 16px;" || true)
if [ -n "${hits}" ]; then
  bad "CSS 里出现字面量字号，请改用 var(--fs-…)："
  echo "${hits}" | sed 's/^/      /'
else
  ok "仅剩受控例外（cqw 图形 / em 等宽 / html 根锚点）"
fi

# ---------------------------------------------------------------------------
# 4. 阶梯只能有一处定义
# ---------------------------------------------------------------------------
section "4. 阶梯来源唯一性"
defs=$(grep -rln -- "--fs-[a-z0-9-]*:" "${SRC}" --include="*.css" 2>/dev/null \
       | grep -v "^${GLOBALS}$" || true)
if [ -n "${defs}" ]; then
  bad "${GLOBALS} 之外出现了 --fs-* 定义，阶梯必须单一来源："
  echo "${defs}" | sed 's/^/      /'
else
  ok "仅 ${GLOBALS}"
fi

# 断点内重定义阶梯同样破坏单一来源
redef=$(awk '/@media/{inmedia=1} inmedia && /--fs-[a-z0-9-]*:/{print FILENAME":"FNR": "$0} /^}/{inmedia=0}' \
        "${GLOBALS}" src/app/xds.css 2>/dev/null || true)
if [ -n "${redef}" ]; then
  bad "@media 内重定义了阶梯变量。阶梯自身应使用 clamp() 随视口收放，而非按断点覆盖："
  echo "${redef}" | sed 's/^/      /'
else
  ok "@media 内无阶梯重定义"
fi

# ---------------------------------------------------------------------------
printf '\n'
if [ "${fail}" -ne 0 ]; then
  printf '\033[31m排版阶梯检查未通过。\033[0m 规范：skills/ui-typography/SKILL.md\n'
  exit 1
fi
printf '\033[32m排版阶梯检查通过。\033[0m\n'
