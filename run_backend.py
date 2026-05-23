"""启动后端服务 - 直接使用conda环境的Python"""
import sys
import os

# 切换到项目根目录
os.chdir('D:/ICD-AutoCoder')

# 设置PYTHONPATH
os.environ['PYTHONPATH'] = 'D:/ICD-AutoCoder/backend'

# 直接使用conda环境的Python
PYTHON_EXE = r"D:\Cursor\Anaconda3\envs\icd-autocoder\python.exe"

sys.path.insert(0, 'D:/ICD-AutoCoder/backend')

from app.main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level="warning")