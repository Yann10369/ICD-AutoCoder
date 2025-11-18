
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.core.logger import logger


class MockPredictor:

    
    # 模拟的ICD预测结果
    MOCK_PREDICTIONS = [
        {
            'code': '410.71',
            'description': 'Subendocardial infarction',
            'probability': 0.89
        },
        {
            'code': '410.7',
            'description': 'Subendocardial infarction, initial episode',
            'probability': 0.82
        },
        {
            'code': '410',
            'description': 'Acute myocardial infarction',
            'probability': 0.75
        },
        {
            'code': '428.0',
            'description': 'Congestive heart failure, unspecified',
            'probability': 0.68
        },
        {
            'code': '414.01',
            'description': 'Coronary atherosclerosis of native coronary artery',
            'probability': 0.61
        },
        {
            'code': '412',
            'description': 'Old myocardial infarction',
            'probability': 0.54
        },
        {
            'code': '414.0',
            'description': 'Coronary atherosclerosis',
            'probability': 0.47
        },
        {
            'code': '427.31',
            'description': 'Atrial fibrillation',
            'probability': 0.43
        },
        {
            'code': '428.1',
            'description': 'Left heart failure',
            'probability': 0.39
        },
        {
            'code': '424.1',
            'description': 'Aortic valve disorders',
            'probability': 0.35
        }
    ]
    
    # 模拟的实体识别结果
    MOCK_ENTITIES = {
        'diseases': ['myocardial infarction', 'heart failure', 'coronary artery disease'],
        'symptoms': ['chest pain', 'shortness of breath', 'fatigue'],
        'procedures': ['echocardiogram', 'cardiac catheterization', 'ecg'],
        'medications': ['aspirin', 'atorvastatin', 'metoprolol']
    }
    
    # 模拟的关键词热度
    MOCK_KEYWORD_HEATMAP = [
        {'term': 'chest pain', 'importance': 0.95},
        {'term': 'myocardial infarction', 'importance': 0.89},
        {'term': 'shortness of breath', 'importance': 0.82},
        {'term': 'ecg', 'importance': 0.75},
        {'term': 'st segment elevation', 'importance': 0.71},
        {'term': 'troponin', 'importance': 0.68},
        {'term': 'coronary artery', 'importance': 0.64},
        {'term': 'heart failure', 'importance': 0.61},
        {'term': 'ejection fraction', 'importance': 0.58},
        {'term': 'cardiac enzymes', 'importance': 0.55}
    ]
    
    # 模拟的特征重要性
    MOCK_FEATURE_IMPORTANCE = [
        {'name': 'chest pain', 'score': 0.92},
        {'name': 'st elevation', 'score': 0.87},
        {'name': 'troponin elevated', 'score': 0.83},
        {'name': 'ecg abnormal', 'score': 0.79},
        {'name': 'coronary occlusion', 'score': 0.74},
        {'name': 'cardiac enzymes', 'score': 0.70},
        {'name': 'left ventricular dysfunction', 'score': 0.66},
        {'name': 'hypotension', 'score': 0.62},
        {'name': 'arrhythmia', 'score': 0.59},
        {'name': 'elevated bnp', 'score': 0.56}
    ]
    
    # 模拟的决策路径
    MOCK_DECISION_PATH = [
        {
            'description': '数据预处理：文本清洗、分词、标准化',
            'confidence': 1.0
        },
        {
            'description': '实体识别：识别到心肌梗死、心力衰竭等相关医学术语',
            'confidence': 0.95
        },
        {
            'description': '模型预测：CAML模型预测ICD编码 410.71 (置信度: 0.89)',
            'confidence': 0.89
        },
        {
            'description': '知识图谱过滤：验证ICD编码在层次结构中的合理性',
            'confidence': 0.92
        },
        {
            'description': 'LLM验证：大模型验证预测结果的临床合理性',
            'confidence': 0.87
        },
        {
            'description': '结果融合：多模型协同推理，融合最终结果',
            'confidence': 0.85
        }
    ]
    
    @staticmethod
    def predict(case_text: str, model: Optional[str] = None, top_k: int = 10, threshold: float = 0.5) -> Dict[str, Any]:

        import time
        start_time = time.time()
        
        # 过滤并截取结果
        filtered_predictions = [
            pred for pred in MockPredictor.MOCK_PREDICTIONS
            if pred['probability'] >= threshold
        ][:top_k]
        
        # 计算平均置信度
        avg_confidence = sum(p['probability'] for p in filtered_predictions) / len(filtered_predictions) if filtered_predictions else 0
        
        # 生成响应
        response = {
            # 实体识别结果
            'entities': MockPredictor.MOCK_ENTITIES,
            'entityCount': sum(len(v) for v in MockPredictor.MOCK_ENTITIES.values()),
            
            # ICD预测结果
            'icdPredictions': filtered_predictions,
            
            # 统计数据
            'avgConfidence': round(avg_confidence, 3),
            'processingTime': int((time.time() - start_time) * 1000),
            
            # 可解释性数据
            'keywordHeatmap': MockPredictor.MOCK_KEYWORD_HEATMAP[:10],
            'featureImportance': MockPredictor.MOCK_FEATURE_IMPORTANCE[:10],
            
            # 决策路径
            'decisionPath': MockPredictor.MOCK_DECISION_PATH,
            
            # 元数据
            'modelsUsed': [model] if model else ['CAML', 'DCAN'],
            'preprocessedText': case_text[:200] + '...' if len(case_text) > 200 else case_text,
            'originalText': case_text,
            
            # 测试标识
            'isMock': True,
            'mockMode': True
        }
        
        logger.info(f"模拟预测完成，返回 {len(filtered_predictions)} 个结果")
        return response
    
    @staticmethod
    def get_graph_data(icd_code: str) -> Dict[str, Any]:

        mock_graph_data = {
            'nodes': [
                {'id': '410', 'label': 'Acute myocardial infarction', 'level': 1},
                {'id': '410.7', 'label': 'Subendocardial infarction', 'level': 2},
                {'id': '410.71', 'label': 'Subendocardial infarction, initial episode', 'level': 3}
            ],
            'edges': [
                {'source': '410', 'target': '410.7', 'type': 'parent-child'},
                {'source': '410.7', 'target': '410.71', 'type': 'parent-child'}
            ]
        }
        return mock_graph_data
    
    @staticmethod
    def get_explain_data(icd_code: str) -> Dict[str, Any]:

        mock_explain_data = {
            'icd_code': icd_code,
            'icd_name': 'Subendocardial infarction, initial episode',
            'explanation': f'该ICD编码 {icd_code} 表示心内膜下心肌梗死，首次发作。',
            'related_codes': [
                {'code': '410', 'name': 'Acute myocardial infarction', 'relation': 'parent'},
                {'code': '410.7', 'name': 'Subendocardial infarction', 'relation': 'parent'}
            ],
            'keywords': ['chest pain', 'st elevation', 'troponin'],
            'confidence': 0.89
        }
        return mock_explain_data


# 全局模拟预测器实例
mock_predictor = MockPredictor()

