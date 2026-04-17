# Scrapping - 参考

**来源：** ClawHub - berthelol/scrapping v0.1.3

**功能：** 一键抓取TikTok、Ins等社交平台的公开数据

**依赖：** ScrapeCreators API (scrapecreators.com)，需要API key

**不支持内网环境**，仅作为参考保存。

---

## 核心设计

1. **API模式** - 统一的REST API调用
2. **分页处理** - cursor机制
3. **数据提取** - jq命令格式化JSON
4. **错误处理** - HTTP状态码检查

---

## API端点示例

```
GET https://api.scrapecreators.com/v1/{platform}/{endpoint}
Header: x-api-key: YOUR_API_KEY
```

---

**仅供学习，不适配内网版本**
