# 技能中心命令接口

## 快速调用示例

### 1. 代码审查
```
hub.reviewCode('你的代码')
```

### 2. 写博客
```
hub.writeBlog('AI发展趋势')
hub.writeBlog('高考志愿填报技巧', {style: 'tutorial'})
```

### 3. 数据分析
```
hub.analyze([1,2,3,4,5])
hub.analyze(userData, {groupBy: 'category'})
```

### 4. 项目规划
```
hub.planProject('微信小程序', '需要分析设计开发测试上线')
```

### 5. 情绪检测
```
hub.detectFrustration('不对！不是这样！')
```

### 6. 任务分类
```
hub.classifyTask('帮我写一篇博客')
hub.classifyTask('分析这些数据')
```

### 7. 上下文压缩
```
hub.compactContext(messages)
hub.compactContext(messages, {forceLevel: 2})
```

### 8. 研究助手
```
hub.research('AI大模型')
```

### 9. 小红书写作
```
hub.writeXiaohongshu('高考志愿填报技巧', {type: 'tutorial'})
```

### 10. 可视化
```
hub.createChart({labels: ['A','B','C'], values: [10,20,30]})
hub.createTable({headers:['姓名','分数'], rows:[['张三',580],['李四',590]]})
```

### 11. 特性开关
```
hub.isFeatureEnabled('frustration_detector')
hub.toggleFeature('voice_mode')
```

### 12. 批量获取状态
```
hub.getAllSkillStatus()
```
