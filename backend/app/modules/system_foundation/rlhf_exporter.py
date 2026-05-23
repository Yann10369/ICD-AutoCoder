"""
RLHF (Reinforcement Learning from Human Feedback) 数据导出器

功能：
1. 高价值训练样本筛选（AI被拒绝、手动添加编码、质控打回）
2. 训练数据格式转换
3. 批量导出功能
4. 样本质量评分
"""
from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)


class SampleType(Enum):
    """样本类型枚举"""
    AI_REJECTED = "ai_rejected"           # AI推荐被拒绝
    MANUAL_ADDED = "manual_added"          # 手动添加编码
    QA_REJECTED = "qa_rejected"            # 质控打回
    CORRECTION = "correction"              # 编码修正


class RLHFExporter:
    """RLHF训练数据导出器"""

    def __init__(self):
        self._sample_queue: List[Dict] = []
        self._exported_samples: List[Dict] = []

    def enqueue_sample(self, sample: Dict) -> str:
        """
        将样本加入训练队列

        Args:
            sample: 训练样本数据

        Returns:
            sample_id: 样本ID
        """
        sample_id = f"sample_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(self._sample_queue)}"
        sample["sample_id"] = sample_id
        sample["enqueued_at"] = datetime.now().isoformat()
        sample["quality_score"] = self._calculate_quality_score(sample)
        sample["exported"] = False

        self._sample_queue.append(sample)
        logger.info(f"RLHF样本已入队: {sample_id}, 类型: {sample.get('sample_type')}")
        return sample_id

    def export_samples(
        self,
        coder_id: int = None,
        days: int = 30,
        min_quality_score: float = 0.5,
        sample_types: List[str] = None,
        limit: int = 1000,
        format: str = "json"  # json/csv/parquet
    ) -> Dict:
        """
        导出高价值RLHF训练样本

        Args:
            coder_id: 按编码员过滤
            days: 时间范围（天）
            min_quality_score: 最小质量分数
            sample_types: 样本类型过滤
            limit: 最大返回数量
            format: 导出格式

        Returns:
            导出结果
        """
        cutoff_time = (datetime.now() - timedelta(days=days)).isoformat()

        # 筛选样本
        filtered_samples = []
        for sample in self._sample_queue:
            # 时间过滤
            if sample["enqueued_at"] < cutoff_time:
                continue

            # 质量分数过滤
            if sample.get("quality_score", 0) < min_quality_score:
                continue

            # 编码员过滤
            if coder_id and sample.get("coder_id") != coder_id:
                continue

            # 样本类型过滤
            if sample_types and sample.get("sample_type") not in sample_types:
                continue

            filtered_samples.append(sample)

        # 按质量分数排序，取前limit个
        filtered_samples.sort(key=lambda x: x.get("quality_score", 0), reverse=True)
        filtered_samples = filtered_samples[:limit]

        # 标记为已导出
        for sample in filtered_samples:
            sample["exported"] = True
            sample["exported_at"] = datetime.now().isoformat()
            self._exported_samples.append(sample)

        # 按格式转换
        if format == "json":
            output_data = json.dumps(filtered_samples, ensure_ascii=False, indent=2)
        elif format == "csv":
            output_data = self._convert_to_csv(filtered_samples)
        else:
            output_data = filtered_samples

        return {
            "success": True,
            "total_samples": len(filtered_samples),
            "exported_at": datetime.now().isoformat(),
            "format": format,
            "samples": filtered_samples,
            "output_data": output_data if format == "json" else None,
            "statistics": self._calculate_export_stats(filtered_samples)
        }

    def get_sample_queue_stats(self) -> Dict:
        """获取样本队列统计信息"""
        total_samples = len(self._sample_queue)
        exported_count = sum(1 for s in self._sample_queue if s.get("exported", False))
        pending_count = total_samples - exported_count

        # 按类型统计
        type_counts = {}
        for sample in self._sample_queue:
            sample_type = sample.get("sample_type", "unknown")
            type_counts[sample_type] = type_counts.get(sample_type, 0) + 1

        # 平均质量分数
        avg_quality = sum(s.get("quality_score", 0) for s in self._sample_queue) / total_samples if total_samples > 0 else 0

        return {
            "total_samples": total_samples,
            "exported_count": exported_count,
            "pending_count": pending_count,
            "type_breakdown": type_counts,
            "avg_quality_score": round(avg_quality, 2),
            "high_quality_count": sum(1 for s in self._sample_queue if s.get("quality_score", 0) >= 0.8)
        }

    def get_coder_training_grade(self, coder_id: int, days: int = 30) -> Dict:
        """
        获取编码员的训练等级（用于模型个性化）

        等级说明：
        - A: 既不盲目全信AI，也不全都手动，中间态最佳
        - B: 太依赖AI，修正能力弱
        - C: 几乎不用AI，AI能力不足
        """
        cutoff_time = (datetime.now() - timedelta(days=days)).isoformat()

        coder_samples = [
            s for s in self._sample_queue
            if s.get("coder_id") == coder_id and s["enqueued_at"] >= cutoff_time
        ]

        if not coder_samples:
            return {
                "coder_id": coder_id,
                "grade": "N/A",
                "sample_count": 0,
                "message": "样本不足，无法评估"
            }

        # 计算AI采纳率
        ai_accepted = sum(1 for s in coder_samples if s.get("sample_type") == "ai_accepted")
        ai_rejected = sum(1 for s in coder_samples if s.get("sample_type") == "ai_rejected")
        manual_added = sum(1 for s in coder_samples if s.get("sample_type") == "manual_added")

        total_actions = ai_accepted + ai_rejected
        ai_adoption_rate = ai_accepted / total_actions if total_actions > 0 else 0

        # 确定等级
        if 0.3 <= ai_adoption_rate <= 0.8 and manual_added >= 5:
            grade = "A"
            description = "最佳训练样本来源 - 有独立判断，合理利用AI"
        elif ai_adoption_rate > 0.9:
            grade = "B"
            description = "太依赖AI - 修正能力较弱，需更多训练"
        elif ai_adoption_rate < 0.2:
            grade = "C"
            description = "几乎不用AI - AI能力不足，需针对性优化"
        else:
            grade = "D"
            description = "样本特征不明显"

        return {
            "coder_id": coder_id,
            "grade": grade,
            "description": description,
            "ai_adoption_rate": round(ai_adoption_rate, 2),
            "ai_accepted_count": ai_accepted,
            "ai_rejected_count": ai_rejected,
            "manual_added_count": manual_added,
            "total_samples": len(coder_samples)
        }

    def build_training_prompt(self, sample: Dict) -> str:
        """
        构建训练用的Prompt格式

        将操作记录转换为LLM训练样本格式
        """
        sample_type = sample.get("sample_type")

        if sample_type == "ai_rejected":
            prompt = f"""<|user|>
病历文本: {sample.get('case_text', '')}
AI推荐编码: {sample.get('ai_suggestion', '')}

请判断此AI推荐是否合适，如不合适请给出正确编码。

<|assistant|>
此AI推荐不合适，原因: {sample.get('reason', '')}
正确编码应为: {sample.get('human_decision', '')}
"""

        elif sample_type == "manual_added":
            prompt = f"""<|user|>
病历文本: {sample.get('case_text', '')}
AI推荐的编码中缺少以下关键诊断:

请补充完整编码。

<|assistant|>
补充编码: {sample.get('human_decision', '')}
补充原因: 病历中明确提及，AI未识别到
"""

        else:
            prompt = f"""<|user|>
病历文本: {sample.get('case_text', '')}
当前编码: {sample.get('current_codes', '')}

请进行质控审核。

<|assistant|>
{sample.get('human_decision', '')}
"""

        return prompt

    def _calculate_quality_score(self, sample: Dict) -> float:
        """
        计算样本质量分数（0-1）

        评分维度：
        - 是否有明确的理由说明（权重0.4）
        - 人类决策是否完整（权重0.3）
        - 上下文是否充足（权重0.3）
        """
        score = 0.0

        # 有明确理由
        if sample.get("reason") and len(sample["reason"]) > 10:
            score += 0.4

        # 人类决策完整
        if sample.get("human_decision") and len(sample["human_decision"]) > 5:
            score += 0.3

        # 上下文充足
        if sample.get("case_text") and len(sample["case_text"]) > 50:
            score += 0.3

        return round(score, 2)

    def _convert_to_csv(self, samples: List[Dict]) -> str:
        """转换为CSV格式"""
        import csv
        import io

        output = io.StringIO()
        if not samples:
            return ""

        fieldnames = [
            "sample_id", "sample_type", "case_id", "coder_id",
            "case_text", "ai_suggestion", "human_decision",
            "reason", "quality_score", "enqueued_at"
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for sample in samples:
            row = {k: sample.get(k, "") for k in fieldnames}
            writer.writerow(row)

        return output.getvalue()

    def _calculate_export_stats(self, samples: List[Dict]) -> Dict:
        """计算导出样本统计"""
        type_counts = {}
        for sample in samples:
            sample_type = sample.get("sample_type", "unknown")
            type_counts[sample_type] = type_counts.get(sample_type, 0) + 1

        avg_quality = sum(s.get("quality_score", 0) for s in samples) / len(samples) if samples else 0

        return {
            "type_breakdown": type_counts,
            "avg_quality_score": round(avg_quality, 2),
            "high_quality_count": sum(1 for s in samples if s.get("quality_score", 0) >= 0.8),
            "coder_count": len(set(s.get("coder_id") for s in samples if s.get("coder_id")))
        }


# 全局RLHF导出器实例
rlhf_exporter = RLHFExporter()
