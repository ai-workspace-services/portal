#!/usr/bin/env bash
set -euo pipefail

TARGET="${TARGET:?TARGET must be set}"
CONTAINER_PORT="${CONTAINER_PORT:?CONTAINER_PORT must be set}"

container="portal-${TARGET}-validation"
base="http://127.0.0.1:18080"

# 之前这个脚本失败时不留任何线索：唯一的 docker logs 只在第 30 次重试才执行，
# 而末尾那两条 curl（一条没有 if 保护、一条管进 grep）在 pipefail 下会静默退出 1。
# 结果 CI 上看到的就是「0 秒、退出码 1、零输出」。这里把失败路径全部改成会说话的。
dump() {
  echo "----- 容器状态 -----"
  docker ps -a --filter "name=${container}" --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' || true
  echo "----- 容器日志 -----"
  docker logs "$container" 2>&1 | tail -80 || echo "(无日志：容器可能已被 --rm 移除)"
}
fail() {
  echo "::error::smoke test failed for ${TARGET}: $1"
  dump
  exit 1
}

docker run --rm -d \
  --name "$container" \
  -p "18080:${CONTAINER_PORT}" \
  -e RUNTIME_ENV=prod \
  -e REGION=cn \
  "portal-${TARGET}:validation"
trap 'docker stop "$container" >/dev/null 2>&1 || true' EXIT

ready=""
for attempt in $(seq 1 30); do
  # 容器崩溃退出时不必再等满 30 秒
  if ! docker ps --filter "name=${container}" --format '{{.Names}}' | grep -q "$container"; then
    fail "容器在第 ${attempt} 次探测前就退出了"
  fi
  if curl --fail --silent --output /dev/null "${base}/"; then
    ready="yes"
    echo "根路径在第 ${attempt} 次探测就绪"
    break
  fi
  sleep 1
done
[ -n "$ready" ] || fail "30 次探测后 ${base}/ 仍不可用"

if [ "$TARGET" = "static-dashboard" ]; then
  code="$(curl --silent --output /dev/null --write-out '%{http_code}' "${base}/api/ping")"
  [ "$code" = "404" ] || fail "/api/ping 期望 404，实际 ${code}"
else
  # all-in-one 的 Nginx 比 Next standalone 更早监听 8080：根路径成功并不
  # 表示代理后的 /api/ping 已就绪。等待健康响应，避免刚启动就把竞态误判为失败。
  body=""
  for attempt in $(seq 1 30); do
    if ! docker ps --filter "name=${container}" --format '{{.Names}}' | grep -q "$container"; then
      fail "容器在 /api/ping 第 ${attempt} 次探测前就退出了"
    fi
    candidate="$(curl --fail --silent "${base}/api/ping" 2>/dev/null || true)"
    case "$candidate" in
      *'"status":"ok"'*)
        body="$candidate"
        echo "/api/ping 在第 ${attempt} 次探测就绪"
        break
        ;;
    esac
    sleep 1
  done
  [ -n "$body" ] || fail "30 次探测后 /api/ping 仍未返回健康响应"
  echo "/api/ping 响应: ${body}"
fi

echo "${TARGET} 冒烟测试通过"
