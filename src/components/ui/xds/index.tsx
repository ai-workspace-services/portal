"use client";

/**
 * XConnect Micro SaaS 模版 —— 基础组件
 *
 * 规范来源：ai-workspace-services/.github → design-system/micro-saas-模版
 * 样式来自 src/app/xds.css，全部类名以 `xds-` 前缀命名、变量挂在 `.xds`
 * 作用域下，所以这些组件必须放在带 `.xds` class 的容器内使用。
 *
 * 设计约束（照抄规范，改动前先读 DESIGN-SYSTEM.md 第 5 节）：
 * - 一个视觉区块内只能有一个 primary 按钮
 * - 平面组件一律无阴影，深度靠 border-subtle → default → strong 三档边框
 * - 状态必须同时用颜色和文字表达，不允许只靠色点区分
 * - 空态必须带一个出口按钮
 */

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

export type XdsTone = "neutral" | "success" | "warning" | "danger" | "info";
export type XdsButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type XdsButtonSize = "sm" | "md" | "lg";

const BADGE_TONE: Record<XdsTone, string> = {
  neutral: "",
  success: "xds-badge-success",
  warning: "xds-badge-warning",
  danger: "xds-badge-danger",
  info: "xds-badge-info",
};

const ALERT_TONE: Record<XdsTone, string> = {
  neutral: "xds-alert-info",
  success: "xds-alert-success",
  warning: "xds-alert-warning",
  danger: "xds-alert-danger",
  info: "xds-alert-info",
};

const BUTTON_VARIANT: Record<XdsButtonVariant, string> = {
  primary: "xds-btn-primary",
  secondary: "xds-btn-secondary",
  ghost: "xds-btn-ghost",
  danger: "xds-btn-danger",
};

const BUTTON_SIZE: Record<XdsButtonSize, string> = {
  sm: "xds-btn-sm",
  md: "",
  lg: "xds-btn-lg",
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function buttonClass(
  variant: XdsButtonVariant,
  size: XdsButtonSize,
  block: boolean,
  pill: boolean,
  className?: string,
): string {
  return cx(
    "xds-btn",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    block && "xds-btn-block",
    pill && "xds-btn-pill",
    className,
  );
}

/* ------------------------------------------------------------------ Button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: XdsButtonVariant;
  size?: XdsButtonSize;
  block?: boolean;
  pill?: boolean;
};

export function XdsButton({
  variant = "secondary",
  size = "md",
  block = false,
  pill = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    // eslint-disable-next-line react/button-has-type
    <button
      type={type}
      className={buttonClass(variant, size, block, pill, className)}
      {...rest}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: XdsButtonVariant;
  size?: XdsButtonSize;
  block?: boolean;
  pill?: boolean;
};

export function XdsLinkButton({
  variant = "secondary",
  size = "md",
  block = false,
  pill = false,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <a className={buttonClass(variant, size, block, pill, className)} {...rest} />
  );
}

/* -------------------------------------------------------------------- Card */

export function XdsCard({
  children,
  className,
  hover = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("xds-card", hover && "xds-card-hover", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function XdsCardHead({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("xds-card-head", className)}>
      <div style={{ minWidth: 0 }}>
        <div className="xds-panel-title">{title}</div>
        {description ? (
          <p className="xds-t-caption" style={{ marginTop: 3 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="xds-row">{actions}</div> : null}
    </div>
  );
}

export function XdsCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("xds-card-body", className)}>{children}</div>;
}

export function XdsCardFoot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("xds-card-foot", className)}>{children}</div>;
}

/* ------------------------------------------------------------------- Badge */

export function XdsBadge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: XdsTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("xds-badge", BADGE_TONE[tone], className)}>
      {dot ? <i className="xds-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function XdsTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx("xds-tag", className)}>{children}</span>;
}

/* ------------------------------------------------------------------- Meter */

/**
 * 配额 / 用量进度条。≥75% 转 warning，≥90% 转 danger —— 颜色由数值决定，
 * 调用方不需要自己判断。
 */
export function XdsMeter({
  percent,
  label,
  className,
}: {
  percent: number | null | undefined;
  label?: string;
  className?: string;
}) {
  const value =
    typeof percent === "number" && Number.isFinite(percent)
      ? Math.min(100, Math.max(0, percent))
      : 0;
  const tone =
    value >= 90 ? "xds-is-danger" : value >= 75 ? "xds-is-warning" : "";
  return (
    <div
      className={cx("xds-meter", tone, className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

/* -------------------------------------------------------------------- Stat */

export function XdsStat({
  label,
  value,
  unit,
  meta,
  aside,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="xds-card xds-stat">
      <div className={aside ? "xds-row-between" : undefined}>
        <div className="xds-stat-label">{label}</div>
        {aside}
      </div>
      <div className="xds-stat-value">
        {value}
        {unit ? <span className="xds-unit">{unit}</span> : null}
      </div>
      {children}
      {meta ? <div className="xds-stat-meta">{meta}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

/**
 * 空态永远要给下一步 —— action 不是可选装饰，是这个组件存在的理由。
 */
export function XdsEmpty({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("xds-empty", className)}>
      {icon ? (
        <div className="xds-empty-icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="xds-empty-title">{title}</div>
      {description ? <div className="xds-empty-desc">{description}</div> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Alert */

export function XdsAlert({
  tone = "info",
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: XdsTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("xds-alert", ALERT_TONE[tone], className)}>
      {icon ? (
        <span className="xds-alert-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <span className="xds-alert-title">{title}</span> : null}
        {children ? <p className="xds-alert-body">{children}</p> : null}
      </div>
      {action ? <div style={{ flex: "none" }}>{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------- Typography */

export function XdsEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx("xds-t-eyebrow", className)}>{children}</span>;
}

export function XdsSectionHead({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("xds-sec-head", className)}>
      {eyebrow ? <XdsEyebrow>{eyebrow}</XdsEyebrow> : null}
      <h2 className="xds-t-h1">{title}</h2>
      {lead ? <p className="xds-t-lead">{lead}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Values */

/**
 * 标识符与数值统一走等宽字 + tabular-nums，便于纵向对齐和整段选中复制。
 */
export function XdsValueBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("xds-value-box", className)}>{children}</div>;
}

export function XdsMono({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx("xds-t-mono", className)}>{children}</span>;
}
