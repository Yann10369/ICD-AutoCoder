/**
 * 测试病例数据服务
 * 从外部JSON文件加载测试病例数据
 */

// 测试病例数据（可直接导入或通过fetch获取）
export const TEST_CASE_DATA = [
  {
    case_id: "CASE-001",
    patient_id: "PAT-001",
    patient_name: "张三",
    age: 65,
    gender: "男",
    department: "心内科",
    admission_date: "2024-01-15",
    discharge_date: "2024-01-22",
    chief_complaint: "突发胸痛3小时",
    present_illness: "患者3小时前无明显诱因出现胸骨后压榨样疼痛，向左肩背部放射，伴大汗、恶心，无呕吐、呼吸困难、咯血。含服硝酸甘油片后症状无明显缓解。急诊入院查心电图提示V1-V4导联ST段弓背向上抬高0.2-0.4mV，肌钙蛋白I升高。既往高血压病史10年，最高血压180/100mmHg，规律服用氨氯地平控制血压。2型糖尿病史5年，口服二甲双胍治疗。吸烟史30年，20支/日。",
    physical_exam: "T 36.8℃, P 92次/分, R 20次/分, BP 150/90mmHg。神志清楚，痛苦面容，口唇无发绀。双肺呼吸音清，未闻及干湿啰音。心界不大，心率92次/分，律齐，心音低钝，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛，肝脾未触及。双下肢无水肿。",
    lab_results: {
      "肌钙蛋白I": "2.5ng/ml (升高)",
      "CK-MB": "45U/L (升高)",
      "肌红蛋白": "120ng/ml (升高)",
      "血糖": "8.5mmol/L",
      "血脂": "TC 5.2mmol/L, LDL-C 3.4mmol/L"
    },
    diagnosis: ["急性前壁ST段抬高型心肌梗死", "原发性高血压3级 很高危", "2型糖尿病"],
    treatment: ["急诊冠状动脉造影+支架植入术（LAD）", "阿司匹林+氯吡格雷双联抗血小板", "低分子肝素抗凝", "他汀类调脂", "ACEI改善心肌重构", "β受体阻滞剂降低心肌耗氧"],
    priority: "emergency",
    expected_codes: ["I21.0", "I10", "E11.9"]
  },
  {
    case_id: "CASE-002",
    patient_id: "PAT-002",
    patient_name: "李四",
    age: 72,
    gender: "男",
    department: "呼吸内科",
    admission_date: "2024-01-14",
    discharge_date: "2024-01-21",
    chief_complaint: "反复咳嗽咳痰10年，加重伴呼吸困难3天",
    present_illness: "患者10年前开始出现反复咳嗽咳痰，每年冬季加重，诊断为慢性阻塞性肺疾病。3天前受凉后出现咳嗽加重，咳黄脓痰，伴活动后呼吸困难，休息后不能完全缓解。既往吸烟史40年，每日20支，已戒烟5年。高血压病史8年，规律服用硝苯地平控释片。",
    physical_exam: "T 38.5℃, P 105次/分, R 26次/分, BP 145/85mmHg, SpO2 90% (室内空气)。神志清楚，呼吸急促，桶状胸，双肺叩诊过清音，双肺呼吸音粗，可闻及散在哮鸣音及湿啰音。心率105次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹软，无压痛，双下肢无水肿。",
    lab_results: {
      "血常规": "WBC 12.5×10^9/L, N% 85%",
      "CRP": "68mg/L",
      "PCT": "0.8ng/ml",
      "血气分析": "pH 7.35, PaO2 68mmHg, PaCO2 52mmHg"
    },
    diagnosis: ["慢性阻塞性肺疾病急性加重", "社区获得性肺炎", "原发性高血压2级 高危"],
    treatment: ["头孢哌酮舒巴坦抗感染", "布地奈德+特布他林雾化吸入", "静脉用甲泼尼龙", "无创呼吸机辅助通气", "化痰、对症支持治疗"],
    priority: "high",
    expected_codes: ["J44.1", "J15.9", "I10"]
  },
  {
    case_id: "CASE-003",
    patient_id: "PAT-003",
    patient_name: "王五",
    age: 58,
    gender: "女",
    department: "内分泌科",
    admission_date: "2024-01-13",
    discharge_date: "2024-01-20",
    chief_complaint: "多饮多尿10年，加重伴恶心呕吐2天",
    present_illness: "患者10年前诊断为2型糖尿病，口服二甲双胍、格列美脲降糖治疗，血糖控制不佳。2天前出现恶心呕吐，伴口渴、多尿、乏力症状加重。既往糖尿病肾病病史，尿蛋白阳性。眼底检查提示糖尿病视网膜病变II期。",
    physical_exam: "T 37.2℃, P 95次/分, R 20次/分, BP 130/80mmHg。神志清楚，精神差，脱水貌。呼气有烂苹果味。双肺呼吸音清，未闻及啰音。心率95次/分，律齐，各瓣膜听诊区未闻及病理性杂音。腹部无压痛，双肾区无叩击痛。双下肢轻度水肿。",
    lab_results: {
      "血糖": "18.5mmol/L",
      "糖化血红蛋白": "9.8%",
      "尿常规": "尿糖3+, 酮体2+, 尿蛋白1+",
      "血肌酐": "132μmol/L",
      "电解质": "Na 138mmol/L, K 4.8mmol/L"
    },
    diagnosis: ["2型糖尿病伴酮症", "糖尿病肾病G2A2期", "糖尿病视网膜病变II期"],
    treatment: ["胰岛素静脉泵入降糖", "补液纠正酮症", "纠正电解质紊乱", "ACEI减少尿蛋白", "糖尿病健康教育"],
    priority: "medium",
    expected_codes: ["E11.1", "E11.2", "E11.3"]
  }
];

// 完整的测试病例集（兼容旧格式）
export const TEST_CASES = TEST_CASE_DATA.map(tc => ({
  ...tc,
  // 兼容旧格式的字段名
  id: tc.case_id,
  patientName: tc.patient_name,
  admissionDate: tc.admission_date,
  dischargeDate: tc.discharge_date,
  // 兼容 buildFullMedicalText 使用的字段名
  presentIllness: tc.present_illness,
  physicalExam: tc.physical_exam,
  labResults: tc.lab_results,
  diagnosis: tc.diagnosis,
  treatment: tc.treatment,
}));

// 获取随机测试病例
export const getRandomTestCase = () => {
  return TEST_CASES[Math.floor(Math.random() * TEST_CASES.length)];
};

// 根据ID获取测试病例
export const getTestCaseById = (id) => {
  return TEST_CASES.find(c => c.case_id === id || c.id === id);
};

// 获取病例列表摘要
export const getTestCaseSummaries = () => {
  return TEST_CASES.map(c => ({
    id: c.case_id,
    patientName: c.patient_name,
    age: c.age,
    gender: c.gender,
    department: c.department,
    admissionDate: c.admission_date,
    chiefComplaint: c.chief_complaint,
    priority: c.priority,
  }));
};

export default TEST_CASES;