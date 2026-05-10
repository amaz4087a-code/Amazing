export interface IndicatorConfig {
  id: string;
  name: string;
  description: string;
  defaultWeight: number;
}

export const INDICATORS: IndicatorConfig[] = [
  { id: "accuracy",        name: "准确性",   description: "关节点位置与标准动作的偏离程度",       defaultWeight: 0.20 },
  { id: "rhythm",          name: "节奏感",   description: "动作与标准节奏的同步程度",             defaultWeight: 0.15 },
  { id: "fluidity",        name: "流畅度",   description: "动作的平滑程度（加加速度分析）",       defaultWeight: 0.10 },
  { id: "explosiveness",   name: "爆发力",   description: "动作的速度变化率（模拟爆发力）",       defaultWeight: 0.10 },
  { id: "extension",       name: "伸展度",   description: "关节活动范围（ROM）对比",             defaultWeight: 0.10 },
  { id: "symmetry",        name: "对称性",   description: "左右对称关节动作的协调程度",           defaultWeight: 0.10 },
  { id: "stability",       name: "稳定性",   description: "身体质心的稳定程度",                   defaultWeight: 0.10 },
  { id: "coordination",    name: "协调性",   description: "不同关节之间动作的协调程度",           defaultWeight: 0.10 },
  { id: "syncRate",        name: "节奏同步率", description: "动作节拍与标准节拍的时间偏差",       defaultWeight: 0.05 },
  { id: "rangeOfMotion",   name: "动作幅度", description: "关节角度幅度与标准的对比",             defaultWeight: 0.05 },
  { id: "completeness",    name: "完成度",   description: "用户完成动作占标准动作的比例",         defaultWeight: 0.05 },
];

export const DEFAULT_SCORING_RATIOS: Record<string, number> =
  Object.fromEntries(INDICATORS.map((i) => [i.id, i.defaultWeight]));
