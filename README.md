# 墨海 — 多作者小说发布平台

基于 React + Express + Prisma 构建的多作者小说发布平台，支持作者发布小说/章节、读者阅读/收藏/评论、管理员审核管理。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Tailwind CSS + Vite |
| 后端 | Node.js + Express |
| 数据库 | SQLite（本地开发）/ PostgreSQL（生产） |
| ORM | Prisma |
| 认证 | JWT (jsonwebtoken + bcryptjs) |

## 项目结构

```
novel-platform/
├── prisma/
│   ├── schema.prisma          # Prisma 数据模型定义
│   └── seed.js                # 种子数据（创建测试用户和小说）
├── src/                        # 后端代码
│   ├── server.js               # Express 入口
│   ├── utils/
│   │   └── prisma.js           # Prisma Client 单例
│   ├── middleware/
│   │   ├── auth.js             # JWT 认证中间件
│   │   └── role.js             # 角色权限中间件
│   ├── controllers/
│   │   ├── authController.js   # 注册/登录/获取当前用户
│   │   ├── novelController.js  # 小说 CRUD + 作者管理
│   │   ├── chapterController.js# 章节 CRUD
│   │   ├── commentController.js# 评论 CRUD
│   │   ├── favoriteController.js# 收藏管理
│   │   └── adminController.js  # 管理后台（审核/用户管理/统计）
│   └── routes/
│       ├── auth.js
│       ├── novels.js
│       ├── chapters.js
│       ├── comments.js
│       ├── favorites.js
│       └── admin.js
├── frontend/                   # 前端代码
│   ├── index.html
│   ├── vite.config.js          # Vite 配置（含 API 代理）
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx            # React 入口
│       ├── App.jsx             # 路由 + 权限守卫
│       ├── index.css           # Tailwind 全局样式
│       ├── api/
│       │   └── index.js        # Axios API 封装
│       ├── context/
│       │   └── AuthContext.jsx # 认证状态上下文
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── NovelCard.jsx
│       │   └── ChapterList.jsx
│       └── pages/
│           ├── Home.jsx         # 首页（小说列表 + 搜索）
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── NovelDetail.jsx  # 小说详情（章节 + 评论 + 收藏）
│           ├── AuthorDashboard.jsx # 作者中心（发布/管理小说）
│           └── AdminPanel.jsx   # 管理后台（审核/统计/用户）
├── package.json               # 根 package.json（后端依赖 + 脚本）
├── .env                       # 环境变量
├── .gitignore
└── README.md
```

## 数据库模型

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │       │  Novel   │       │ Chapter  │
│──────────│       │──────────│       │──────────│
│ id       │──┐    │ id       │──┐    │ id       │
│ email    │  └──< │ authorId │  └──< │ novelId  │
│ username │       │ title    │       │ serial#  │
│ password │       │ desc     │       │ title    │
│ role     │       │ category │       │ content  │
│ avatar   │       │ status   │       │ pubAt    │
│ bio      │       │ reviewSt │       └──────────┘
└──────────┘       │ coverUrl │
     │              └──────────┘
     │                   │
     │              ┌────┴────┐
     │              │         │
┌────┴─────┐  ┌────┴────┐
│ Comment  │  │ Favorite │
│──────────│  │──────────│
│ id       │  │ id       │
│ userId   │  │ userId   │
│ novelId  │  │ novelId  │
│ content  │  └──────────┘
└──────────┘
```

**角色权限：**

| 角色 | 权限 |
|------|------|
| USER | 阅读、收藏、评论 |
| AUTHOR | 包含 USER 权限 + 发布小说、管理章节 |
| ADMIN | 包含所有权限 + 审核小说、管理用户 |

## 快速启动

### 前置要求

- Node.js >= 18
- npm >= 9

### 步骤

```bash
# 1. 安装所有依赖（根 + 前端）
cd novel-platform
npm run install:all

# 2. 生成 Prisma Client 并创建数据库表
npx prisma generate
npx prisma migrate dev --name init

# 3. 填充种子数据（创建测试用户和小说）
npm run prisma:seed

# 4. 启动开发服务器（前后端同时启动）
npm run dev:full
```

启动后：
- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api
- Prisma Studio（可视化管理数据库）: 运行 `npx prisma studio` 后访问 http://localhost:5555

### 测试账号

种子数据创建的账号：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@novel.com | admin123 |
| 作者 | author@novel.com | author123 |
| 读者 | reader@novel.com | reader123 |

## API 路由一览

### 认证 `/api/auth`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /register | 注册 | 公开 |
| POST | /login | 登录 | 公开 |
| GET | /me | 获取当前用户 | 需登录 |

### 小说 `/api/novels`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | / | 小说列表（仅已审核） | 公开 |
| GET | /:id | 小说详情 | 公开 |
| GET | /author/my-novels | 我的小说 | AUTHOR/ADMIN |
| POST | / | 创建小说 | AUTHOR/ADMIN |
| PUT | /:id | 更新小说 | 作者本人/ADMIN |
| DELETE | /:id | 删除小说 | 作者本人/ADMIN |

### 章节 `/api/chapters`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /novel/:novelId | 章节列表 | 公开 |
| GET | /:id | 章节正文 | 公开 |
| POST | /novel/:novelId | 创建章节 | 作者本人/ADMIN |
| PUT | /:id | 更新章节 | 作者本人/ADMIN |
| DELETE | /:id | 删除章节 | 作者本人/ADMIN |

### 评论 `/api/comments`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /novel/:novelId | 评论列表 | 公开 |
| POST | /novel/:novelId | 发表评论 | 需登录 |
| DELETE | /:id | 删除评论 | 本人/ADMIN |

### 收藏 `/api/favorites`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /my | 我的收藏 | 需登录 |
| GET | /check/:novelId | 是否已收藏 | 需登录 |
| POST | /:novelId | 收藏 | 需登录 |
| DELETE | /:novelId | 取消收藏 | 需登录 |

### 管理后台 `/api/admin`
| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /stats | 平台统计 | ADMIN |
| GET | /novels | 全部小说 | ADMIN |
| GET | /novels/pending | 待审核列表 | ADMIN |
| PUT | /novels/:id/approve | 审核通过 | ADMIN |
| PUT | /novels/:id/reject | 审核驳回 | ADMIN |
| GET | /users | 用户列表 | ADMIN |
| PUT | /users/:id/role | 修改用户角色 | ADMIN |

## 切换到 PostgreSQL（生产）

1. 修改 `prisma/schema.prisma` 中的 `provider` 从 `"sqlite"` 改为 `"postgresql"`
2. 修改 `.env` 中的 `DATABASE_URL`：
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/novel_platform?schema=public"
   ```
3. 重新执行迁移：
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## 开发命令

```bash
# 后端开发（热重载）
npm run dev

# 前端开发
cd frontend && npm run dev

# 前后端同时启动
npm run dev:full

# 数据库操作
npx prisma generate          # 生成 Client
npx prisma migrate dev       # 执行迁移
npx prisma studio            # 可视化管理数据库
npm run prisma:seed          # 填充种子数据

# 构建
cd frontend && npm run build # 构建前端静态文件
```

## License

MIT
