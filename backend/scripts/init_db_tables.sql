-- ICD-AutoCoder 数据库初始化脚本
-- 运行方式: psql -h localhost -p 15432 -U icd_user -d icd_graph -f init_db_tables.sql

-- 编码池表
CREATE TABLE IF NOT EXISTS coding_pools (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) UNIQUE NOT NULL,
    principal_dx JSONB,
    secondary_dx JSONB,
    procedures JSONB,
    last_modified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 工作队列表
CREATE TABLE IF NOT EXISTS worklist_cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) UNIQUE NOT NULL,
    patient_name VARCHAR(100),
    patient_id VARCHAR(64),
    department VARCHAR(100),
    discharge_date TIMESTAMP,
    admission_diagnosis TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'pending_coding',
    assigned_coder_id INT,
    assigned_coder_name VARCHAR(100),
    coding_start_time TIMESTAMP,
    coding_duration_seconds INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 质控记录表
CREATE TABLE IF NOT EXISTS qa_records (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL,
    action VARCHAR(30),
    qa_officer_id INT,
    coder_id INT,
    timestamp TIMESTAMP,
    comment TEXT,
    force_reason TEXT,
    correction_suggestions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 编码结果对比表
CREATE TABLE IF NOT EXISTS coding_results (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) UNIQUE NOT NULL,
    ai_suggested JSONB,
    coder_selected JSONB,
    coding_duration_minutes INT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    log_id VARCHAR(64) UNIQUE NOT NULL,
    case_id VARCHAR(64),
    user_id INT,
    action_type VARCHAR(30),
    action_details JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 状态转移历史表
CREATE TABLE IF NOT EXISTS transition_history (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    user_role VARCHAR(20),
    user_id INT,
    reason TEXT,
    extra JSONB,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 特殊编码规则表（星剑号配对等）
CREATE TABLE IF NOT EXISTS special_coding_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(30) NOT NULL,  -- 'star_dagger', 'm_code', 'external_cause'
    code VARCHAR(20) NOT NULL,
    paired_code VARCHAR(20),
    description TEXT,
    keywords JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_worklist_cases_case_id ON worklist_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_worklist_cases_status ON worklist_cases(status);
CREATE INDEX IF NOT EXISTS idx_worklist_cases_priority ON worklist_cases(priority);
CREATE INDEX IF NOT EXISTS idx_worklist_cases_assigned_coder ON worklist_cases(assigned_coder_id);
CREATE INDEX IF NOT EXISTS idx_qa_records_case_id ON qa_records(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_transition_history_case_id ON transition_history(case_id);
CREATE INDEX IF NOT EXISTS idx_special_coding_rules_type ON special_coding_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_coding_results_case_id ON coding_results(case_id);

-- 插入默认星剑号配对规则（部分常见配对）
INSERT INTO special_coding_rules (rule_type, code, paired_code, description, keywords) VALUES
-- 糖尿病相关
('star_dagger', 'E10.2*', 'E10.9†', '1型糖尿病伴神经并发症', '["糖尿病神经病变"]'),
('star_dagger', 'E11.0*', 'E11.9†', '2型糖尿病伴昏迷', '["糖尿病昏迷"]'),
('star_dagger', 'E13.1*', 'E13.9†', '其他特指糖尿病伴昏迷', '["糖尿病昏迷"]'),
-- 心血管相关
('star_dagger', 'I25.10*', 'I51.8†', '动脉粥样硬化性心脏病伴心肌衰竭', '["心衰", "心力衰竭"]'),
('star_dagger', 'I48.91*', 'I48.92†', '心房颤动伴快速心室率', '["房颤", "心室率"]'),
-- 肾脏相关
('star_dagger', 'N18.3*', 'N18.9†', '慢性肾脏病3期', '["CKD", "慢性肾病"]'),
('star_dagger', 'N18.4*', 'N18.9†', '慢性肾脏病4期', '["CKD", "慢性肾病"]'),
-- 神经相关
('star_dagger', 'G63.2*', 'E10.4†', '糖尿病性神经病', '["糖尿病神经病变"]'),
('star_dagger', 'G40.0*', 'G40.9†', '局灶性癫痫伴癫痫持续状态', '["癫痫", "持续状态"]'),
-- 其他常见配对
('star_dagger', 'J44.0*', 'J44.9†', '慢性阻塞性肺病伴急性加重', '["慢阻肺", "急性加重"]'),
('star_dagger', 'K50.1*', 'K50.9†', '克罗恩病伴并发症', '["克罗恩"]'),
('star_dagger', 'K70.3*', 'K70.9†', '酒精性肝硬化', '["肝硬化", "酒精"]'),
('star_dagger', 'K74.6*', 'K74.9†', '肝硬化伴腹水', '["肝硬化", "腹水"]'),
-- 感染相关
('star_dagger', 'A41.9*', 'A49.9†', '脓毒症休克', '["脓毒症", "休克"]'),
-- 肿瘤相关
('star_dagger', 'C34.9*', 'C78.0†', '肺癌伴脑转移', '["肺癌", "脑转移"]'),
('star_dagger', 'C50.9*', 'C79.3†', '乳腺癌伴脑转移', '["乳腺癌", "脑转移"]')
ON CONFLICT DO NOTHING;

-- 插入M码形态学规则
INSERT INTO special_coding_rules (rule_type, code, paired_code, description, keywords) VALUES
('m_code', 'M8140/3', NULL, '腺癌', '["腺癌"]'),
('m_code', 'M8070/3', NULL, '鳞状细胞癌', '["鳞状细胞癌", "鳞癌"]'),
('m_code', 'M8041/3', NULL, '小细胞癌', '["小细胞癌"]'),
('m_code', 'M8500/3', NULL, '浸润性导管癌', '["浸润性导管癌"]'),
('m_code', 'M8500/2', NULL, '导管原位癌', '["导管原位癌", "导管内癌"]'),
('m_code', 'M8170/3', NULL, '肝细胞癌', '["肝细胞癌"]'),
('m_code', 'M8310/3', NULL, '透明细胞癌', '["透明细胞癌"]'),
('m_code', 'M8490/3', NULL, '转移性腺癌', '["转移性腺癌"]'),
('m_code', 'M8560/3', NULL, '腺鳞癌', '["腺鳞癌"]'),
('m_code', 'M8720/3', NULL, '恶性黑色素瘤', '["黑色素瘤"]')
ON CONFLICT DO NOTHING;

-- 插入外部原因编码规则
INSERT INTO special_coding_rules (rule_type, code, paired_code, description, keywords) VALUES
('external_cause', 'W19', NULL, '同一平面跌倒', '["跌倒", "摔伤"]'),
('external_cause', 'W17', NULL, '从高处坠落', '["高处坠落", "坠落"]'),
('external_cause', 'V49', NULL, '机动车交通事故', '["车祸", "交通事故", "驾车"]'),
('external_cause', 'X99', NULL, '利器伤', '["刀砍伤", "利器伤", "刺伤"]'),
('external_cause', 'X19', NULL, '热液烫伤', '["烫伤", "热液", "灼伤"]'),
('external_cause', 'T75.4', NULL, '电击伤', '["电击", "触电"]'),
('external_cause', 'W10', NULL, '楼梯跌落', '["楼梯跌落", "跌落"]'),
('external_cause', 'W18', NULL, '运动损伤', '["运动损伤", "扭伤"]'),
('external_cause', 'Y93.9', NULL, '未特指的活动原因', '["活动"]'),
('external_cause', 'W86', NULL, '意外触电', '["触电", "电击"]')
ON CONFLICT DO NOTHING;