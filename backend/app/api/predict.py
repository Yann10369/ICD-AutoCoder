"""预测API路由"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import time
import json
from pathlib import Path
from datetime import datetime

from app.core.logger import logger
from app.core.config import settings

router = APIRouter()


class PredictRequest(BaseModel):
    """预测请求模型（匹配前端请求格式）"""
    caseText: str = Field(..., description="病例文本", alias="caseText")
    language: Optional[str] = Field("zh", description="语言")
    preprocessOptions: Optional[Dict[str, bool]] = Field(None, description="预处理选项")
    model: Optional[str] = Field(None, description="指定使用的模型")
    params: Optional[Dict[str, Any]] = Field(None, description="模型参数")
    
    class Config:
        populate_by_name = True


def save_prediction_to_hierarchy(result: Dict[str, Any], original_text: str, model_name: str, top_k: int, threshold: float) -> bool:
    """保存预测结果到icd_hierarchy.json"""
    try:
        icd_hierarchy_path = Path(settings.ICD_HIERARCHY_PATH)
        icd_hierarchy_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 构建要保存的数据结构
        prediction_data = {
            'timestamp': datetime.now().isoformat(),
            'original_text': original_text,
            'model': model_name,
            'top_k': top_k,
            'threshold': threshold,
            'predictions': result,
            'icd_hierarchy': {}
        }
        
        # 从预测结果中提取ICD编码，构建层次结构
        # 首先构建一个代码到描述的映射，用于填充父节点名称
        code_to_description = {}
        for pred in result.get('icdPredictions', []):
            code = pred.get('code', '')
            description = pred.get('description', '')
            if code and description:
                code_to_description[code] = description
        
        icd_hierarchy = {}
        for pred in result.get('icdPredictions', []):
            code = pred.get('code', '')
            description = pred.get('description', '')
            probability = pred.get('probability', 0.0)
            
            if code:
                # 解析ICD编码层次（例如：410.71 -> 410, 410.7, 410.71）
                parts = code.split('.')
                current_code = ''
                
                for i, part in enumerate(parts):
                    if i == 0:
                        current_code = part
                    else:
                        current_code = f"{current_code}.{part}"
                    
                    if current_code not in icd_hierarchy:
                        # 优先使用当前预测结果的描述，如果没有则从映射中查找
                        node_name = description if current_code == code else code_to_description.get(current_code, '')
                        node_probability = probability if current_code == code else max(
                            (p.get('probability', 0.0) for p in result.get('icdPredictions', []) 
                             if p.get('code', '') == current_code),
                            default=0.0
                        )
                        
                        icd_hierarchy[current_code] = {
                            'code': current_code,
                            'name': node_name,
                            'level': i + 1,
                            'parent': '.'.join(parts[:i]) if i > 0 else None,
                            'children': [],
                            'probability': node_probability
                        }
                    
                    # 添加父子关系
                    if i > 0:
                        parent_code = '.'.join(parts[:i])
                        if parent_code in icd_hierarchy:
                            if current_code not in icd_hierarchy[parent_code]['children']:
                                icd_hierarchy[parent_code]['children'].append(current_code)
        
        prediction_data['icd_hierarchy'] = icd_hierarchy
        
        # 保存到文件
        with open(icd_hierarchy_path, 'w', encoding='utf-8') as f:
            json.dump(prediction_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"预测结果已保存到 {icd_hierarchy_path}")
        return True
        
    except Exception as e:
        logger.error(f"保存预测结果失败: {str(e)}")
        return False


@router.post("", include_in_schema=True)
@router.post("/")
async def predict(request: PredictRequest):
    """实时推理接口（使用测试数据）"""
    start_time = time.time()
    
    try:
        from app.tests.mock_predict import mock_predictor
        logger.info("使用测试预测模式")
        
        top_k = request.params.get('topK', 10) if request.params else 10
        threshold = request.params.get('threshold', 0.5) if request.params else 0.5
        model_name = request.model or 'CAML'
        
        result = mock_predictor.predict(
            request.caseText, 
            model=model_name, 
            top_k=top_k, 
            threshold=threshold
        )
        
        # 保存预测结果到icd_hierarchy.json
        save_success = save_prediction_to_hierarchy(
            result, 
            request.caseText, 
            model_name, 
            top_k, 
            threshold
        )
        
        if save_success:
            logger.info("预测结果已保存到icd_hierarchy.json")
        else:
            logger.warning("预测结果保存失败，但继续返回预测结果")
        
        logger.info(f"测试预测完成，返回 {len(result.get('icdPredictions', []))} 个ICD预测结果")
        return result
    
    except Exception as e:
        logger.error(f"测试结果输出失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"测试结果输出失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "mode": "test",
        "message": "测试模式运行中"
    }


@router.get("/sample")
async def get_sample_case():
    """获取样例病例文本"""
    sample_cases = [
        {
            "title": "急性心肌梗死",
            "text": "患者，男性，65岁，因突发胸痛3小时入院。患者诉胸闷、胸痛，疼痛呈压榨样，向左肩及左臂放射，伴大汗、恶心。既往有高血压病史10年。查体：BP 140/90mmHg，心率90次/分，律齐，心音低钝，双肺未闻及干湿啰音。心电图示：V1-V4导联ST段弓背向上抬高。肌钙蛋白I升高。诊断为急性前壁心肌梗死。"
        },
        {
            "title": "心力衰竭",
            "text": "患者，女性，72岁，因活动后气促、双下肢水肿1个月入院。患者既往有冠心病、高血压病史20年。查体：BP 150/95mmHg，心率100次/分，房颤心律，双肺底可闻及湿啰音，心脏扩大，心尖区可闻及奔马律，双下肢中度凹陷性水肿。胸部X线示：心影增大，肺淤血。超声心动图示：左心室扩大，射血分数35%。诊断为慢性心力衰竭。"
        },
        {
            "title": "肺炎",
            "text": "患者，男性，45岁，因发热、咳嗽、咳痰5天入院。患者诉发热，体温最高39℃，伴咳嗽、咳黄痰，量多，无胸痛、咯血。查体：T 38.5℃，P 95次/分，R 22次/分，BP 120/80mmHg，右肺下叶可闻及湿啰音。血常规：WBC 12.5×10^9/L，N 85%。胸部CT示：右肺下叶实变影。诊断为社区获得性肺炎。"
        },
        {
            "title": "糖尿病",
            "text": "患者，女性，58岁，因多饮、多尿、多食、体重下降2个月就诊。既往无特殊病史。查体：BP 130/80mmHg，心率80次/分，双下肢无水肿。随机血糖：15.6mmol/L，HbA1c：9.2%。诊断为2型糖尿病。"
        },
        {
            "title": "慢性阻塞性肺疾病",
            "text": "患者，男性，68岁，吸烟史40年，因咳嗽、咳痰、活动后气促10年，加重1周入院。患者诉慢性咳嗽、咳白色黏痰，活动后气促明显。查体：桶状胸，双肺呼吸音低，可闻及散在干啰音。肺功能检查示：FEV1/FVC 60%，FEV1占预计值55%。诊断为慢性阻塞性肺疾病急性加重期。"
        }
    ]
    
    import random
    return {
        "sample_cases": sample_cases,
        "recommended": random.choice(sample_cases)
    }
