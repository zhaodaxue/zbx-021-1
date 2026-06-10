# 🏔️ 造雪联调登记系统

滑雪场造雪班组「管线水压跌落与枪头结霜停机」联调登记系统。

## ✨ 功能特性

- **坡道看板**：按坡道分组展示所有造雪枪实时状态，需融霜枪醒目高亮
- **单枪详情**：水压变化折线图、结霜等级历史、停机记录时间线
- **需融霜待办**：自动识别需融霜的造雪枪，一键确认融霜完成
- **恢复运行登记**：对已完成融霜的造雪枪登记恢复，结霜偏高时智能提醒
- **自动规则判断**：10分钟内3次水压低于阈值 + 结霜等级≥2 → 自动触发需融霜

## 🧱 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS 3 + Chart.js + Zustand
- **后端**：Node.js + Express 4 + TypeScript + SQLite3
- **部署**：Docker + docker-compose 一键部署

## 🐳 Docker 一键运行

### 方式一：docker-compose（推荐）

```bash
# 构建并启动
docker-compose up -d --build

# 初始化演示数据
docker exec -it snowmaking-system node dist/server/scripts/seed.js

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 方式二：纯 Docker

```bash
# 构建镜像
docker build -t snowmaking-system .

# 启动容器
docker run -d \
  --name snowmaking-system \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  snowmaking-system

# 初始化演示数据
docker exec -it snowmaking-system node dist/server/scripts/seed.js
```

启动后访问：http://localhost:3001

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 初始化演示数据
npm run seed

# 启动开发服务器（前端 + 后端）
npm run dev

# 前端单独启动
npm run client:dev

# 后端单独启动
npm run server:dev

# 构建生产版本
npm run build
npm run build:server

# 运行生产版本
npm start
```

- 前端地址：http://localhost:5173
- 后端地址：http://localhost:3001

## 📊 数据模型

### 造雪枪 (snow_guns)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 枪号（主键） |
| slope | TEXT | 所属坡道 |
| min_water_pressure | REAL | 最低工作水压（巴） |
| status | TEXT | 状态：normal / defrost_required / defrost_completed |

### 传感记录 (sensor_records)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| gun_id | TEXT | 造雪枪ID |
| recorded_at | TEXT | 记录时刻 |
| water_pressure | REAL | 管线水压（巴） |
| frost_level | INTEGER | 结霜等级（0-3） |

### 停机登记 (shutdown_records)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| gun_id | TEXT | 造雪枪ID |
| shutdown_at | TEXT | 停机时刻 |
| defrost_confirmed_at | TEXT | 融霜完成确认时刻 |
| recovered_at | TEXT | 恢复时刻（可空） |
| trigger_reason | TEXT | 触发原因 |

## 📋 核心规则

### 需融霜触发条件

同时满足以下两个条件时，造雪枪自动进入「需融霜」状态：

1. **水压条件**：最近 10 分钟内，水压低于最低工作水压的记录 ≥ 3 次
2. **结霜条件**：最新一条记录的结霜等级 ≥ 2

触发后系统自动：
- 更新造雪枪状态为 `defrost_required`
- 创建停机登记记录，`shutdown_at` 设为触发时间
- 在坡道看板和待办列表中醒目显示

### 需融霜期间传感补报数据处理约定

当造雪枪处于「需融霜」状态期间（从触发需融霜到登记恢复运行前），上报的传感数据按以下规则处理：

| 处理项 | 规则说明 |
|--------|----------|
| **数据存储** | ✅ 所有传感数据正常入库保存，不做丢弃 |
| **规则冻结** | ⏸️ 不再对该枪进行新的需融霜规则判断，避免重复触发 |
| **结霜等级更新** | ✅ 最新结霜等级仍会更新显示，便于操作员观察融霜效果 |
| **水压趋势** | ✅ 水压数据仍在折线图中正常展示，可观察管线压力恢复情况 |
| **恢复校验** | ⚠️ 登记恢复运行时，系统校验最近一条结霜等级：<br/>- 若 ≤ 1：正常登记恢复<br/>- 若 ≥ 2：登记成功但弹出警告，建议确认融霜效果 |

> **设计考量**：需融霜状态本质是一个"工单待处理"状态。冻结规则避免了同一把枪因持续上报异常数据而产生多条待办。数据完整保存则保证了审计追踪和问题溯源的完整性。

## 🔌 API 接口

### 造雪枪管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/guns` | 获取所有造雪枪（按坡道分组） |
| GET | `/api/guns/:id` | 获取单枪详情 |
| GET | `/api/guns/:id/sensor-records` | 获取单枪传感记录（可指定 hours 参数） |
| GET | `/api/guns/:id/shutdown-records` | 获取单枪停机记录 |

### 传感数据上报

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/sensor-records` | 上报传感记录（自动触发规则校验） |

**请求体：**
```json
{
  "gunId": "B002",
  "waterPressure": 3.2,
  "frostLevel": 2
}
```

**响应：**
```json
{
  "success": true,
  "recordId": 1024,
  "ruleCheck": {
    "triggered": true,
    "lowPressureCount": 3,
    "latestFrostLevel": 2,
    "shutdownRecord": { ... }
  }
}
```

### 待办管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/todo/defrost` | 获取需融霜待办列表 |
| POST | `/api/todo/defrost/:id/confirm` | 确认融霜完成 |
| GET | `/api/todo/recovery` | 获取待恢复列表 |
| POST | `/api/todo/recovery/:id/confirm` | 登记恢复运行 |

## 🎮 演示数据说明

运行 `npm run seed` 后会生成：

- **12 把造雪枪**：分布在 4 条坡道（初级道A、中级道B、高级道C、魔毯D）
- **2 小时历史数据**：每 5 分钟一条记录，包含水压和结霜等级
- **预设触发条件**：B002 和 C001 已满足需融霜触发条件

### 测试触发需融霜

```bash
# 上报一条新数据触发 B002 需融霜
curl -X POST http://localhost:3001/api/sensor-records \
  -H "Content-Type: application/json" \
  -d '{"gunId":"B002","waterPressure":3.0,"frostLevel":2}'
```

### 运行数据模拟器

```bash
# 每 3 秒随机上报一把枪的传感数据
npx tsx scripts/simulate.ts
```

## 📁 项目结构

```
├── api/                    # 后端代码
│   ├── controllers/        # 控制器层
│   ├── db/                 # 数据库连接
│   ├── repositories/       # 数据访问层
│   ├── routes/             # 路由定义
│   ├── services/           # 业务逻辑层
│   ├── app.ts              # Express 应用
│   └── server.ts           # 服务入口
├── src/                    # 前端代码
│   ├── api/                # API 客户端
│   ├── components/         # 通用组件
│   ├── pages/              # 页面组件
│   ├── store/              # Zustand 状态管理
│   ├── utils/              # 工具函数
│   └── App.tsx             # 应用入口
├── shared/                 # 前后端共享类型
├── scripts/                # 脚本
│   ├── seed.ts             # 演示数据初始化
│   └── simulate.ts         # 传感数据模拟器
├── data/                   # SQLite 数据库文件
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔄 状态流转

```
正常运行 (normal)
       ↓
[10分钟3次水压低 + 结霜≥2] 自动触发
       ↓
需融霜 (defrost_required) → 坡道看板醒目提示
       ↓
[操作员点击"融霜完成确认"]
       ↓
融霜完成待恢复 (defrost_completed) → 恢复登记列表
       ↓
[操作员登记恢复运行]
       ↓
正常运行 (normal)
```

## 📝 License

MIT
