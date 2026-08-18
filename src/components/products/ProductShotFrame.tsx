"use client";

/**
 * 产品截图框 —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 图文展示与首页预览带共用同一个框：顶部窗口条 + 固定比例的画面区。
 * 内容侧没给图（CMS 还没配、或该产品暂时没有截图）时渲染同尺寸的虚线
 * 占位，版式不会因为缺图而塌陷。
 */

import { ImageIcon } from "lucide-react";

interface ProductShotFrameProps {
  src?: string;
  alt: string;
  /** 缺图时占位框里的说明文案 */
  placeholder?: string;
  /** 画面区宽高比，默认 16/10 */
  ratio?: string;
}

export default function ProductShotFrame({
  src,
  alt,
  placeholder,
  ratio,
}: ProductShotFrameProps) {
  return (
    <div className="xds-shot">
      <div className="xds-shot-bar" aria-hidden="true">
        <i className="xds-shot-dot" />
        <i className="xds-shot-dot" />
        <i className="xds-shot-dot" />
      </div>
      <div
        className="xds-shot-media"
        style={ratio ? { aspectRatio: ratio } : undefined}
      >
        {src ? (
          // 走 CMS 返回的任意来源地址，不上 next/image 以免域名白名单拦截
          // eslint-disable-next-line @next/next/no-img-element
          <img src={encodeURI(src)} alt={alt} loading="lazy" />
        ) : (
          <div className="xds-shot-ph">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            <span>{placeholder ?? alt}</span>
          </div>
        )}
      </div>
    </div>
  );
}
