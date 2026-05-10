"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BODY_PARTS, type BodyPartId } from "@/config/joints";
import { DEFAULT_SCORING_RATIOS } from "@/config/indicators";
import { toast } from "sonner";

interface MotionOption {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  relevantBodyParts: string | null;
}

const ALL_BODY_PARTS: BodyPartId[] = [
  "head", "torso", "left_arm", "right_arm", "left_leg", "right_leg",
];

function parseRelevantBodyParts(raw: string | null): BodyPartId[] {
  if (!raw) return ALL_BODY_PARTS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p: string): p is BodyPartId => ALL_BODY_PARTS.includes(p as BodyPartId))
      : ALL_BODY_PARTS;
  } catch {
    return ALL_BODY_PARTS;
  }
}

interface AssessmentConfigProps {
  motions: MotionOption[];
}

export function AssessmentConfig({ motions }: AssessmentConfigProps) {
  const router = useRouter();
  const [selectedMotion, setSelectedMotion] = useState("");
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPartId[]>(ALL_BODY_PARTS);
  const [ratios, setRatios] = useState(DEFAULT_SCORING_RATIOS);
  const [rhythmEnabled, setRhythmEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  function handleMotionSelect(motionId: string) {
    setSelectedMotion(motionId);
    const motion = motions.find((m) => m.id === motionId);
    if (motion) {
      setSelectedBodyParts(parseRelevantBodyParts(motion.relevantBodyParts));
    }
  }

  function toggleBodyPart(part: BodyPartId) {
    setSelectedBodyParts((prev) =>
      prev.includes(part)
        ? prev.filter((p) => p !== part)
        : [...prev, part]
    );
  }

  function updateRatio(key: string, value: number) {
    setRatios((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!selectedMotion) {
      toast.error("请选择标准动作");
      return;
    }
    if (selectedBodyParts.length === 0) {
      toast.error("请至少选择1个测评部位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standardMotionId: selectedMotion,
          selectedBodyParts,
          scoringRatios: ratios,
          rhythmEnabled,
          name: `测评_${motions.find((m) => m.id === selectedMotion)?.name || ""}`,
        }),
      });

      if (!res.ok) throw new Error("创建失败");

      const data = await res.json();
      router.push(`/dashboard/assessment/${data.id}`);
    } catch {
      toast.error("创建测评失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select motion */}
      <Card>
        <CardHeader><CardTitle>1. 选择标准动作</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {motions.map((m) => (
              <div
                key={m.id}
                onClick={() => handleMotionSelect(m.id)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent ${
                  selectedMotion === m.id ? "border-primary bg-accent" : ""
                }`}
              >
                <p className="font-medium">{m.name}</p>
                <div className="mt-1 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {m.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {m.difficulty}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Body parts */}
      <Card>
        <CardHeader><CardTitle>2. 选择测评部位</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(BODY_PARTS) as [BodyPartId, { name: string }][]).map(
              ([key, part]) => (
                <Badge
                  key={key}
                  variant={selectedBodyParts.includes(key) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-4 text-sm"
                  onClick={() => toggleBodyPart(key)}
                >
                  {part.name}
                </Badge>
              )
            )}
          </div>
          {selectedMotion && motions.find((m) => m.id === selectedMotion)?.relevantBodyParts && (
            <p className="mt-3 text-xs text-muted-foreground">
              已根据所选标准动作自动推荐测评部位，您也可以手动调整。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Scoring ratios */}
      <Card>
        <CardHeader><CardTitle>3. 评分权重配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(ratios).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-24 text-sm">{key}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value * 100)}
                onChange={(e) => updateRatio(key, parseInt(e.target.value) / 100)}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm tabular-nums">
                {Math.round(value * 100)}%
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            总分: {Object.values(ratios).reduce((a, b) => a + b, 0) * 100}%
          </p>
        </CardContent>
      </Card>

      {/* Step 4: Options */}
      <Card>
        <CardHeader><CardTitle>4. 其他设置</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rhythmEnabled}
              onChange={(e) => setRhythmEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">启用节奏分析</span>
          </label>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={loading}
        size="lg"
      >
        {loading ? "创建中..." : "开始测评"}
      </Button>
    </div>
  );
}
