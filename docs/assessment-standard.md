# AI 测评标准方案

## 一、身体部位系统

系统定义 6 大身体部位，覆盖 21 个关节：

| 身体部位 | 包含关节 | 
|---------|---------|
| `head` 头部 | `head`, `neck` |
| `torso` 躯干 | `chest`, `spine`, `hip_center` |
| `left_arm` 左臂 | `left_shoulder`, `left_elbow`, `left_wrist`, `left_hand` |
| `right_arm` 右臂 | `right_shoulder`, `right_elbow`, `right_wrist`, `right_hand` |
| `left_leg` 左腿 | `left_hip`, `left_knee`, `left_ankle`, `left_foot` |
| `right_leg` 右腿 | `right_hip`, `right_knee`, `right_ankle`, `right_foot` |

每个关节定义在 `src/config/joints.ts` 的 `JOINTS` 注册表中，通过 `group` 字段关联到所属身体部位。

## 二、动作-身体部位映射

每个标准动作通过 `relevantBodyParts` 字段定义需要评测的身体部位。该字段存储在 `StandardMotion` 模型中，为 JSON 序列化的 `BodyPartId[]`。

- `null` 或未设置：全部 6 个部位参与评测（向后兼容）
- 非空值：仅列出的部位参与评测

### 种子数据映射

| 动作 | 类别 | 相关身体部位 | 说明 |
|------|------|-------------|------|
| 基本手臂上举 | DANCE | `head, torso, left_arm, right_arm` | 上肢为主，不涉及腿部 |
| 标准深蹲 | SPORTS | `torso, left_leg, right_leg` | 下肢为主，手臂仅用于平衡 |
| 弓步拉伸 | SPORTS | `torso, left_leg, right_leg` | 下肢为主，手臂仅用于平衡 |

## 三、评分管线行为

### 身体部位 → 关节展开

选择身体部位后，系统遍历 `JOINTS` 注册表，根据每个关节的 `group` 字段展开为 `selectedJointIds`。该逻辑在 `src/app/api/assessment/[sessionId]/analyze/route.ts:50-63`。

### selectedJointIds 在各记分器中的行为

| 记分器 | 遵守 selectedJointIds？ | 排除时的行为 |
|-------|----------------------|------------|
| accuracy | ✅ | 跳过未选中关节 |
| rhythm | ❌（使用髋部速度做 DTW 对齐） | — |
| fluidity | ✅ | 跳过未选中关节 |
| explosiveness | ✅ | 跳过未选中关节 |
| extension | ✅ | 跳过未选中关节 |
| symmetry | ✅ | 仅当左右配对都在选中集中时计算 |
| **stability** | ✅ | **核心关节被排除时返回 `{ ignored: true }`，UI 显示"不涉及稳定性评估"** |
| coordination | ✅ | 不足 2 个关节时返回中性值 |
| syncRate | ✅ | hip_center 未选中时返回中性值 50 |
| rangeOfMotion | ✅ | 跳过未选中关节 |
| completeness | ✅ | 跳过未选中关节 |

### 稳定性（躯干）约束说明

稳定性记分器依赖 `hip_center` 和 `chest` 两个核心关节。即使上肢训练（如手臂上举），躯干稳定性仍然有参考价值，因为它反映了身体控制能力。因此：

- **大多数动作应包含 `torso`**，即使主要运动部位在上肢或下肢
- 以下情况可排除 `torso`：躺姿/坐姿动作（如卧推、坐姿划船）、单侧肢体康复评测
- 种子数据的映射（手臂上举和深蹲都包含 `torso`）作为最佳实践参考

## 四、创建测评流程

1. 用户选择标准动作
2. 系统根据 `relevantBodyParts` **自动推荐**身体部位
3. 用户可手动调整部位选择（增删）
4. 用户配置评分权重后提交
5. 分析时仅对选中部位包含的关节进行评分

## 五、新增动作指南

添加新标准动作时，按以下规则确定 `relevantBodyParts`：

| 动作类型 | 推荐身体部位 | 示例 |
|---------|-------------|------|
| 上肢训练 | `head, torso, left_arm, right_arm` | 推举、臂屈伸、俯卧撑 |
| 下肢训练 | `torso, left_leg, right_leg` | 深蹲、弓步、提踵 |
| 全身训练 | 全部 6 个 | 波比跳、开合跳、burpee |
| 核心训练 | `head, torso` | 平板支撑、卷腹 |
| 非对称训练 | 按实际需求选择单侧 | 单腿硬拉、网球发球 |

**原则：** 尽量包含 `torso`（躯干稳定性是所有动作的基础），仅在有明确理由时排除。
