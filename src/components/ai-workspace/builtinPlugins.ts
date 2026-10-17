import {
  FileText,
  Image as ImageIcon,
  Presentation,
  ScrollText,
  ShoppingBag,
  Smartphone,
  Table,
  Video,
} from "lucide-react";

/**
 * The built-in plugin catalog shown in the composers, same groups and names
 * as the XWorkmate App's BuiltinPluginCatalog.
 */
export const BUILTIN_PLUGIN_GROUPS = [
  {
    category: "通用",
    items: [
      {
        name: "文档",
        desc: "将任意对话内容整理为可编辑文档，同步导出 Markdown...",
        icon: FileText,
        color: "bg-blue-500",
        textColor: "text-white",
      },
      {
        name: "电子表格",
        desc: "将任意对话内容结构化为可编辑表格，导出 CSV 与...",
        icon: Table,
        color: "bg-emerald-500",
        textColor: "text-white",
      },
      {
        name: "PPT 演示",
        desc: "将对话内容生成可编辑 PPT：图像还原为可编辑元素...",
        icon: Presentation,
        color: "bg-orange-500",
        textColor: "text-white",
      },
      {
        name: "图片",
        desc: "将对话内容输出为图片（JPEG/PNG），支持批量制作...",
        icon: ImageIcon,
        color: "bg-purple-500",
        textColor: "text-white",
      },
      {
        name: "视频",
        desc: "将对话内容编排为分镜脚本...",
        icon: Video,
        color: "bg-red-500",
        textColor: "text-white",
      },
    ],
  },
  {
    category: "电商",
    items: [
      {
        name: "电商头图",
        desc: "按模特、场景、光影分别指定参考图...",
        icon: ShoppingBag,
        color: "bg-indigo-500",
        textColor: "text-white",
      },
      {
        name: "商品详情页",
        desc: "模块化生成详情页长图...",
        icon: ScrollText,
        color: "bg-violet-500",
        textColor: "text-white",
      },
      {
        name: "爆款视频复刻",
        desc: "拆解 TikTok / 抖音爆款脚本...",
        icon: Smartphone,
        color: "bg-red-500",
        textColor: "text-white",
      },
    ],
  },
];
