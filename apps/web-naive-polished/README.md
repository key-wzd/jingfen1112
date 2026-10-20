# TechCompare - 手机参数对比平台

## 项目说明

这是一个纯前端的手机参数对比平台，通过Node.js中间层连接MySQL数据库。

## 功能特性

1. **产品对比页面** - 对比不同手机的参数（屏幕、处理器、内存、存储、摄像头、电池、价格）
2. **功耗对比页面** - 对比不同手机的功耗数据（视频播放、游戏、待机、浏览网页）
3. **数据管理页面** - 上传Excel表格导入数据，或手动添加/编辑/删除手机数据

## 数据库配置

- 主机: localhost
- 端口: 3306
- 用户名: root
- 密码: w20010820.
- 数据库: phone_compare

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd apps/web-naive
pnpm install

# 安装数据库服务依赖
cd server
npm install
```

### 2. 启动MySQL服务

确保MySQL服务已启动，数据库会自动创建。

### 3. 启动项目

方式一：使用启动脚本（Windows）
```bash
双击 start.bat
```

方式二：手动启动
```bash
# 终端1：启动数据库服务
cd apps/web-naive/server
node server.js

# 终端2：启动前端服务
cd apps/web-naive
pnpm dev
```

### 4. 访问应用

- 前端地址: http://localhost:5555
- 数据库服务: http://localhost:3001

## Excel模板格式

上传的Excel文件应包含以下列：

| 列名 | 说明 |
|------|------|
| 品牌 | 手机品牌（如：Apple） |
| 型号 | 手机型号（如：iPhone 15） |
| 屏幕 | 屏幕参数 |
| 处理器 | 处理器型号 |
| 内存 | 内存大小 |
| 存储 | 存储容量 |
| 摄像头 | 摄像头参数 |
| 电池 | 电池信息 |
| 价格 | 价格信息 |
| 电池容量 | 电池容量（mAh数值） |
| 视频播放功耗 | 视频播放功耗（mW） |
| 游戏功耗 | 游戏功耗（mW） |
| 待机功耗 | 待机功耗（mW） |
| 浏览网页功耗 | 浏览网页功耗（mW） |

## 页面导航

- `/` - 首页
- `/compare` - 产品对比
- `/power-consumption` - 功耗对比
- `/config` - 数据管理

## 技术栈

- Vue 3 + TypeScript
- Vite
- ECharts（图表）
- Express（数据库中间层）
- MySQL2
- xlsx（Excel解析）
