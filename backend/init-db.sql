-- 初始化 PostgreSQL + AGE 数据库
-- 注意：AGE 扩展需要在 PostgreSQL 编译时安装
-- 如果使用标准 PostgreSQL 镜像，需要从源码编译 AGE 扩展
-- 或者使用预编译的 AGE PostgreSQL 镜像

-- 尝试创建 AGE 扩展（如果已安装）
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS age;
    RAISE NOTICE 'AGE 扩展已创建';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'AGE 扩展未安装，请使用支持 AGE 的 PostgreSQL 镜像或手动安装 AGE 扩展';
END $$;

-- 如果 AGE 扩展存在，则执行以下操作
DO $$
BEGIN
    -- 加载 AGE 扩展
    PERFORM LOAD 'age';

    -- 设置搜索路径以包含 ag_catalog
    PERFORM set_config('search_path', 'ag_catalog, "$user", public', false);

    -- 创建图（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM ag_catalog.ag_graph WHERE name = 'icd_graph'
    ) THEN
        PERFORM * FROM ag_catalog.create_graph('icd_graph');
        RAISE NOTICE 'AGE 图 icd_graph 已创建';
    ELSE
        RAISE NOTICE 'AGE 图 icd_graph 已存在';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'AGE 扩展未加载，跳过图创建: %', SQLERRM;
END $$;

-- ==================== 病例数据表 ====================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'coder',  -- doctor/coder/auditor/viewer/admin
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 病例主表
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50),
    patient_name VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(10),
    department VARCHAR(50),
    admission_date DATE,
    discharge_date DATE,
    chief_complaint TEXT,
    present_illness TEXT,
    physical_exam TEXT,
    lab_results JSONB,
    admission_diagnosis TEXT,
    final_diagnosis JSONB,
    treatment TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_coding',  -- pending_coding/coding/pending_qa/qa_rejected/completed/archived
    priority VARCHAR(20) DEFAULT 'normal',  -- urgent/high/normal/low
    current_coder_id INT REFERENCES users(id),
    assigned_coder_id INT REFERENCES users(id),
    code_count INT DEFAULT 0,
    ai_acceptance_rate DECIMAL(5,2) DEFAULT 0,
    qa_score INT,
    sla_remaining_seconds INT DEFAULT 86400,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 病例操作历史表（审计溯源）
CREATE TABLE IF NOT EXISTS case_audit_log (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,  -- created/coding/submitted/qa_approved/qa_rejected/archived
    operator_id INT REFERENCES users(id),
    operator_name VARCHAR(100),
    details JSONB,  -- 存储操作详情如修改的编码、评语等
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    operated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at);
CREATE INDEX IF NOT EXISTS idx_cases_current_coder ON cases(current_coder_id);
CREATE INDEX IF NOT EXISTS idx_audit_case_id ON case_audit_log(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_operated_at ON case_audit_log(operated_at);

-- 插入测试用户
INSERT INTO users (username, display_name, role, department) VALUES
    ('zhang', '张编码员', 'coder', '心内科'),
    ('li', '李编码员', 'coder', '呼吸内科'),
    ('wang', '王质控员', 'auditor', '质控科')
ON CONFLICT (username) DO NOTHING;

-- 插入测试病例数据
INSERT INTO cases (case_id, patient_name, age, gender, department, admission_date, discharge_date, admission_diagnosis, status, priority, code_count) VALUES
    ('CASE-001', '张三', 65, '男', '心内科', '2024-01-15', '2024-01-22', '急性前壁心肌梗死', 'coding', 'urgent', 5),
    ('CASE-002', '李四', 72, '男', '呼吸内科', '2024-01-14', '2024-01-21', '慢性阻塞性肺疾病急性加重', 'pending_coding', 'high', 0),
    ('CASE-003', '王五', 58, '女', '内分泌科', '2024-01-13', '2024-01-20', '2型糖尿病伴酮症', 'pending_qa', 'normal', 8),
    ('CASE-004', '赵六', 45, '男', '骨科', '2024-01-12', '2024-01-19', '腰椎间盘突出症', 'completed', 'normal', 12),
    ('CASE-005', '钱七', 68, '女', '神经内科', '2024-01-11', '2024-01-18', '脑梗死后遗症', 'coding', 'high', 3)
ON CONFLICT (case_id) DO NOTHING;

-- 插入操作历史
INSERT INTO case_audit_log (case_id, action, operator_id, operator_name, details, previous_status, new_status) VALUES
    ('CASE-001', 'coding', 1, '张编码员', '{"code_count": 5}', 'pending_coding', 'coding'),
    ('CASE-003', 'submitted', 1, '张编码员', '{"qa_score": 85}', 'coding', 'pending_qa'),
    ('CASE-004', 'qa_approved', 3, '王质控员', '{"comment": "编码准确"}', 'pending_qa', 'completed')
ON CONFLICT DO NOTHING;
