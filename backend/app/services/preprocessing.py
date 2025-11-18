"""数据预处理模块"""
import re
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.core.logger import logger


class TextPreprocessor:
    """文本预处理器"""
    
    MEDICAL_STOPWORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
        'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    }
    
    def __init__(self):
        self.max_length = settings.MAX_TEXT_LENGTH
        self.remove_stopwords = settings.REMOVE_STOPWORDS
        self.keep_numbers = settings.KEEP_NUMBERS
    
    def clean_text(self, text: str) -> str:
        """文本清洗"""
        if not text:
            return ""
        text = text.lower()
        if self.keep_numbers:
            text = re.sub(r'[^\w\s\.\-]', ' ', text)
        else:
            text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        if len(text) > self.max_length:
            text = text[:self.max_length]
            logger.warning(f"文本被截断到 {self.max_length} 字符")
        return text.strip()
    
    def tokenize(self, text: str) -> List[str]:
        """分词"""
        tokens = text.split()
        if self.remove_stopwords:
            tokens = [t for t in tokens if t not in self.MEDICAL_STOPWORDS]
        return tokens
    
    def standardize_terms(self, text: str) -> str:
        """术语标准化"""
        term_mappings = {
            'mi': 'myocardial infarction',
            'cad': 'coronary artery disease',
            'chf': 'congestive heart failure',
            'copd': 'chronic obstructive pulmonary disease',
            'dm': 'diabetes mellitus',
            'htn': 'hypertension',
            'afib': 'atrial fibrillation',
        }
        
        standardized = text
        for abbrev, full_term in term_mappings.items():
            pattern = r'\b' + re.escape(abbrev) + r'\b'
            standardized = re.sub(pattern, full_term, standardized, flags=re.IGNORECASE)
        
        return standardized
    
    def extract_medical_entities(self, text: str) -> Dict[str, List[str]]:
        """医学实体识别"""
        entities = {'diseases': [], 'symptoms': [], 'procedures': [], 'medications': []}
        disease_keywords = ['disease', 'disorder', 'syndrome', 'infection', 'inflammation', 'cancer', 'tumor', 'carcinoma', 'diabetes', 'hypertension', 'pneumonia', 'bronchitis', 'asthma', 'copd']
        symptom_keywords = ['pain', 'ache', 'fever', 'cough', 'shortness', 'breath', 'nausea', 'vomiting', 'diarrhea', 'fatigue', 'weakness', 'headache', 'dizziness', 'chest pain', 'abdominal pain']
        procedure_keywords = ['surgery', 'operation', 'procedure', 'biopsy', 'examination', 'test', 'scan', 'x-ray', 'ct', 'mri', 'ultrasound']
        
        text_lower = text.lower()
        tokens = self.tokenize(text)
        
        for keyword in disease_keywords:
            if keyword in text_lower:
                entities['diseases'].append(keyword)
        for keyword in symptom_keywords:
            if keyword in text_lower:
                entities['symptoms'].append(keyword)
        for keyword in procedure_keywords:
            if keyword in text_lower:
                entities['procedures'].append(keyword)
        
        for key in entities:
            entities[key] = list(set(entities[key]))
        return entities
    
    def preprocess(self, text: str) -> Dict[str, Any]:
        """完整预处理流程"""
        try:
            cleaned = self.clean_text(text)
            standardized = self.standardize_terms(cleaned)
            tokens = self.tokenize(standardized)
            entities = self.extract_medical_entities(text)
            
            return {
                'original_text': text,
                'cleaned_text': cleaned,
                'standardized_text': standardized,
                'tokens': tokens,
                'entities': entities,
                'token_count': len(tokens),
                'preprocessed_text': ' '.join(tokens)
            }
        except Exception as e:
            logger.error(f"预处理失败: {str(e)}")
            raise

preprocessor = TextPreprocessor()

