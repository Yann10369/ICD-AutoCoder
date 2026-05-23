with open('frontend/src/pages/WorklistPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复导入 - 将 Hospital 和 Stethoscope 替换为 Building 和 Activity
content = content.replace(
    'import {\n  FileText,\n  Clock,\n  AlertTriangle,\n  Filter,\n  Search,\n  ChevronDown,\n  User,\n  Calendar,\n  Activity,\n  CheckCircle,\n  Hourglass,\n  RotateCcw,\n  ArrowUpDown,\n  Hospital,\n  Stethoscope\n} from "lucide-react";',
    'import {\n  FileText,\n  Clock,\n  AlertTriangle,\n  Filter,\n  Search,\n  ChevronDown,\n  User,\n  Calendar,\n  Activity,\n  CheckCircle,\n  Hourglass,\n  RotateCcw,\n  ArrowUpDown,\n  Building\n} from "lucide-react";'
)

# 替换使用
content = content.replace('<Hospital size={12} />', '<Building size={12} />')
content = content.replace('<Stethoscope size={12} />', '<Activity size={12} />')

with open('frontend/src/pages/WorklistPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('WorklistPage.jsx fixed!')
