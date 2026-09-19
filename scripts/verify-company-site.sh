#!/usr/bin/env bash
# ==============================================================================
# XWork Technologies LLC — 官网与产品合规回归自测脚本
# 用途：
#   1. 本地代码扫描：检查公开发布面是否有残留的 onwalk.net、gmail、跳出 svc.plus、死链
#   2. 线上服务探测（--remote）：模拟爬虫探活 xworktech.com、检测 Cloudflare 403 质询、
#      验证 www 域名 301 解析、验证法人实体文本与统一支持邮箱
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PASS_COUNT=0
FAIL_COUNT=0

# 终端彩色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
  echo -e "  ${GREEN}✓ PASS:${NC} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo -e "  ${RED}✗ FAIL:${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_warn() {
  echo -e "  ${YELLOW}! WARN:${NC} $1"
}

header() {
  echo -e "\n${BOLD}====================================================================${NC}"
  echo -e "${BOLD} $1${NC}"
  echo -e "${BOLD}====================================================================${NC}"
}

MODE="local"
if [[ "${1:-}" == "--remote" || "${1:-}" == "-r" || "${1:-}" == "--all" ]]; then
  MODE="all"
elif [[ "${1:-}" == "--remote-only" ]]; then
  MODE="remote"
fi

# ==============================================================================
# 阶段 1：本地代码与配置回归审计
# ==============================================================================
if [[ "${MODE}" == "local" || "${MODE}" == "all" ]]; then
  header "阶段 1：本地代码与品牌标识静态审计 (Local Static Audit)"
  cd "${PORTAL_ROOT}"

  # 1. 检查 @gmail.com
  log_info "检查公开目录是否残留 @gmail.com ..."
  GMAIL_MATCHES=$(git grep -n -I -E "@gmail\.com" -- src/app src/components src/i18n src/lib src/modules src/data ':!*.test.*' ':!**/__tests__/**' 2>/dev/null || true)
  if [[ -z "${GMAIL_MATCHES}" ]]; then
    log_pass "公开发布面无任何 @gmail.com 个人邮箱残留"
  else
    log_fail "检测到残留的 @gmail.com:\n${GMAIL_MATCHES}"
  fi

  # 2. 检查 onwalk.net 品牌或版权残留
  log_info "检查公开目录是否残留 onwalk 品牌/版权 ..."
  ONWALK_MATCHES=$(git grep -n -I -E "©[^\n]*onwalk|www\.onwalk\.net|https://onwalk\.net" -- src/app src/components src/i18n src/lib src/modules src/data ':!*.test.*' ':!**/__tests__/**' 2>/dev/null || true)
  if [[ -z "${ONWALK_MATCHES}" ]]; then
    log_pass "公开发布面无任何 onwalk.net 品牌或版权残留"
  else
    log_fail "检测到残留的 onwalk.net 品牌:\n${ONWALK_MATCHES}"
  fi

  # 3. 检查已废弃的 github.com/x-evor
  log_info "检查公开目录是否残留 github.com/x-evor ..."
  EVOR_MATCHES=$(git grep -n -I -E "github\.com/x-evor|\"x-evor/" -- src/app src/components src/i18n src/lib src/modules src/data ':!*.test.*' ':!**/__tests__/**' 2>/dev/null || true)
  if [[ -z "${EVOR_MATCHES}" ]]; then
    log_pass "公开发布面无旧 GitHub 账号 (x-evor) 残留"
  else
    log_fail "检测到旧 GitHub 账号引用:\n${EVOR_MATCHES}"
  fi

  # 4. 检查产品下载是否跳入被 403 阻断的 console.svc.plus
  log_info "检查产品数据是否跳入 console.svc.plus/download ..."
  CONSOLE_DOWNLOAD_MATCHES=$(git grep -n -I -E "console\.svc\.plus/download" -- src/app src/components src/data src/modules 2>/dev/null || true)
  if [[ -z "${CONSOLE_DOWNLOAD_MATCHES}" ]]; then
    log_pass "产品下载链接未指向 console.svc.plus/download"
  else
    log_fail "产品下载仍跳向 console.svc.plus/download:\n${CONSOLE_DOWNLOAD_MATCHES}"
  fi

  # 5. 检查已知的死链模式 (pricing/xcloudflow, xcloudflow/signup 等)
  log_info "检查是否存在已知的死链模式 ..."
  DEAD_LINK_MATCHES=$(git grep -n -I -E "pricing/xcloudflow|xcloudflow/signup|xscopehub/signup|xworktech\.com/xcloudflow/docs" -- src/app src/components src/data src/modules 2>/dev/null || true)
  if [[ -z "${DEAD_LINK_MATCHES}" ]]; then
    log_pass "未发现已知死链模式"
  else
    log_fail "发现死链引用:\n${DEAD_LINK_MATCHES}"
  fi

  # 6. 运行 Vitest 单元测试
  log_info "运行 company identity 自动化断言测试套件 ..."
  if npm test -- src/lib/company.test.ts >/dev/null 2>&1; then
    log_pass "src/lib/company.test.ts 单元测试全部通过"
  else
    log_fail "src/lib/company.test.ts 单元测试未通过，请检查"
  fi
fi

# ==============================================================================
# 阶段 2：线上端点探活与审核合规检测 (Remote Endpoint Audit)
# ==============================================================================
if [[ "${MODE}" == "remote" || "${MODE}" == "all" ]]; then
  header "阶段 2：线上生产环境与合规审核探针 (Remote Live Probing)"

  TARGET_DOMAIN="xworktech.com"
  WWW_DOMAIN="www.xworktech.com"
  BOT_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

  # 1. 检查主站 HTTP 状态码
  log_info "检测主站 https://${TARGET_DOMAIN} 连通性 ..."
  MAIN_HTTP_CODE=$(curl -sSL -o /dev/null -w "%{http_code}" --max-time 10 "https://${TARGET_DOMAIN}/" 2>/dev/null || echo "ERR")
  if [[ "${MAIN_HTTP_CODE}" == "200" ]]; then
    log_pass "主站返回 HTTP 200 OK"
  else
    log_fail "主站返回异常状态码: ${MAIN_HTTP_CODE} (期望 200)"
  fi

  # 2. 检查是否有 Cloudflare 人机拦截 (Managed Challenge / 403)
  log_info "检测主站是否被 Cloudflare 质询拦截 (Bot Challenge) ..."
  MAIN_CONTENT=$(curl -sSL -A "${BOT_UA}" --max-time 10 "https://${TARGET_DOMAIN}/" 2>/dev/null || true)
  if echo "${MAIN_CONTENT}" | grep -iq "Just a moment\|cf-browser-verification\|challenge-platform"; then
    log_fail "主站触发了 Cloudflare 人机验证页面，自动化审核探针将被阻断！"
  else
    log_pass "主站未触发 Cloudflare 人机拦截，爬虫可直接解析"
  fi

  # 3. 验证主站包含法人实体名称
  log_info "验证主站 HTML 是否包含法人全称 'XWork Technologies LLC' ..."
  if echo "${MAIN_CONTENT}" | grep -iq "XWork Technologies LLC"; then
    log_pass "主站已正确渲染法人名称 'XWork Technologies LLC'"
  else
    log_fail "主站源码中未检测到 'XWork Technologies LLC'"
  fi

  # 4. 验证 www 域名解析与 301 跳转
  log_info "检测 ${WWW_DOMAIN} 解析与重定向合约 ..."
  WWW_RES=$(curl -sI --max-time 8 "https://${WWW_DOMAIN}/" 2>/dev/null || true)
  if echo "${WWW_RES}" | grep -iq "HTTP/.* 301\|HTTP/.* 302\|HTTP/.* 200"; then
    log_pass "${WWW_DOMAIN} 具备有效网络响应与重定向能力"
  else
    log_warn "${WWW_DOMAIN} 无法连接或未配置有效 DNS，若在申请表填带 www 网址可能导致审核失败！"
  fi

  # 5. 验证核心产品介绍页 /products/xworkmate
  log_info "检测产品页 https://${TARGET_DOMAIN}/products/xworkmate ..."
  XWORKMATE_RES=$(curl -sSL -A "${BOT_UA}" --max-time 10 "https://${TARGET_DOMAIN}/products/xworkmate" 2>/dev/null || true)
  if echo "${XWORKMATE_RES}" | grep -iq "XWorkmate"; then
    log_pass "/products/xworkmate 正常呈现产品名称"
  else
    log_fail "/products/xworkmate 未检测到 XWorkmate 内容"
  fi

  # 5b. 公开页面必须由 xworktech.com 自身承载，不能 3xx 跳出品牌域名
  log_info "检测公开页面是否跳出 ${TARGET_DOMAIN} ..."
  for path in / /about /contact /terms /privacy /support /products/xworkmate /products/xconnect /products/ai-workspace /products/open-platform /prices /download /docs /blogs; do
    RESULT=$(curl -sS -o /dev/null -A "${BOT_UA}" -w "%{http_code} %{redirect_url}" --max-time 10 "https://${TARGET_DOMAIN}${path}" 2>/dev/null || echo "ERR")
    CODE="${RESULT%% *}"
    LOCATION="${RESULT#* }"
    if [[ "${CODE}" == 3* && "${LOCATION}" != "https://${TARGET_DOMAIN}"* ]]; then
      log_fail "${path} -> ${CODE} 跳转到 ${LOCATION}（应由 ${TARGET_DOMAIN} 直接渲染）"
    elif [[ "${CODE}" == "200" ]]; then
      log_pass "${path} 由 ${TARGET_DOMAIN} 直接返回 200"
    else
      log_fail "${path} 返回 ${RESULT}（期望 200）"
    fi
  done

  # 6. 验证公共邮箱统一性
  log_info "检测联系面是否统一使用 @xworktech.com ..."
  CONTACT_RES=$(curl -sSL --max-time 10 "https://${TARGET_DOMAIN}/contact" 2>/dev/null || true)
  if echo "${CONTACT_RES}" | grep -iq "@xworktech\.com"; then
    log_pass "联系面包含 @xworktech.com 企业邮箱"
  else
    log_warn "联系页面未直接匹配到 @xworktech.com (可能依赖客户端渲染)"
  fi
  if echo "${CONTACT_RES}" | grep -iq "@gmail\.com"; then
    log_fail "联系页面出现了 @gmail.com 个人邮箱，必须清理！"
  else
    log_pass "联系页面无 @gmail.com 泄露"
  fi
fi

# ==============================================================================
# 总结与判定
# ==============================================================================
header "自测结果总结 (Verification Summary)"
echo -e "通过检查项: ${GREEN}${PASS_COUNT}${NC}"
echo -e "失败检查项: ${RED}${FAIL_COUNT}${NC}"

if [[ ${FAIL_COUNT} -eq 0 ]]; then
  echo -e "\n${GREEN}${BOLD}恭喜！所有合规与代码规范自检项全部通过 (ALL CHECKS PASSED)！${NC}"
  echo -e "主站与产品页已具备 30 秒审核合规标准，可安全回复审核邮件或提交审核。\n"
  exit 0
else
  echo -e "\n${RED}${BOLD}警告：存在 ${FAIL_COUNT} 个未通过检查项，请优先修复后再提交审核！${NC}\n"
  exit 1
fi
