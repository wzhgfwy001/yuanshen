/**
 * mapping-loader 测试套件
 * 
 * 测试范围：
 * 1. 映射加载功能
 * 2. getMappedCategory 扩展逻辑
 * 3. 缓存状态
 * 4. 错误处理
 */

const fs = require('fs');
const path = require('path');

describe('mapping-loader', () => {
  let mappingLoader;
  let MAPPING_FILE;
  let backupContent;
  
  const TEST_MAPPING = {
    "_enabled": true,
    "_comment": "测试用映射配置",
    "category_remap": {
      "specialized": {
        "Test Agent A": "finance",
        "Test Agent B": "legal"
      },
      "data": {
        "Data Agent X": "analytics",
        "Data Agent Y": "engineering"
      },
      "*": {
        "Fallback Agent": "general"
      }
    }
  };

  beforeAll(() => {
    // 确保测试目录存在
    const testDir = path.join(__dirname);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // 清理模块缓存，确保每次测试都是干净的
    jest.resetModules();
    
    // 备份原始映射文件
    MAPPING_FILE = path.join(__dirname, '..', 'category-mapping.json');
    if (fs.existsSync(MAPPING_FILE)) {
      backupContent = fs.readFileSync(MAPPING_FILE, 'utf8');
    }
  });

  afterEach(() => {
    // 恢复原始映射文件
    if (backupContent) {
      fs.writeFileSync(MAPPING_FILE, backupContent, 'utf8');
      backupContent = null;
    }
  });

  // ========== 测试1: 映射加载功能 ==========
  describe('映射加载功能', () => {
    test('正常加载有效的映射文件', () => {
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(TEST_MAPPING, null, 2), 'utf8');
      
      mappingLoader = require('../mapping-loader');
      
      expect(mappingLoader.isMappingEnabled()).toBe(true);
      
      const status = mappingLoader.getCacheStatus();
      expect(status.enabled).toBe(true);
      expect(status.cached).toBe(true);
    });

    test('文件不存在时禁用映射', () => {
      if (fs.existsSync(MAPPING_FILE)) {
        fs.unlinkSync(MAPPING_FILE);
      }
      
      mappingLoader = require('../mapping-loader');
      
      expect(mappingLoader.isMappingEnabled()).toBe(false);
    });

    test('_enabled=false时禁用映射', () => {
      const disabledMapping = { ...TEST_MAPPING, _enabled: false };
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(disabledMapping, null, 2), 'utf8');
      
      mappingLoader = require('../mapping-loader');
      
      expect(mappingLoader.isMappingEnabled()).toBe(false);
    });
  });

  // ========== 测试2: getMappedCategory 扩展逻辑 ==========
  describe('getMappedCategory 扩展逻辑', () => {
    beforeEach(() => {
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(TEST_MAPPING, null, 2), 'utf8');
      mappingLoader = require('../mapping-loader');
    });

    test('specialized 分类的 agent 正确映射', () => {
      const result = mappingLoader.getMappedCategory('specialized', 'Test Agent A');
      
      expect(result.wasMapped).toBe(true);
      expect(result.mappedCategory).toBe('finance');
      expect(result.originalCategory).toBe('specialized');
      expect(result.agentName).toBe('Test Agent A');
    });

    test('specialized 分类的无映射 agent 返回原分类', () => {
      const result = mappingLoader.getMappedCategory('specialized', 'Unknown Agent');
      
      expect(result.wasMapped).toBe(false);
      expect(result.mappedCategory).toBe('specialized');
    });

    test('其他 category 的 agent 正确映射', () => {
      const result = mappingLoader.getMappedCategory('data', 'Data Agent X');
      
      expect(result.wasMapped).toBe(true);
      expect(result.mappedCategory).toBe('analytics');
      expect(result.originalCategory).toBe('data');
    });

    test('通配符 * category 的 agent 正确映射', () => {
      const result = mappingLoader.getMappedCategory('anything', 'Fallback Agent');
      
      expect(result.wasMapped).toBe(true);
      expect(result.mappedCategory).toBe('general');
      expect(result.mappedFrom).toBe('*');
    });

    test('无 agentName 时返回原分类', () => {
      const result = mappingLoader.getMappedCategory('specialized');
      
      expect(result.wasMapped).toBe(false);
      expect(result.mappedCategory).toBe('specialized');
    });

    test('agentName 为 null 时返回原分类', () => {
      const result = mappingLoader.getMappedCategory('specialized', null);
      
      expect(result.wasMapped).toBe(false);
      expect(result.mappedCategory).toBe('specialized');
    });
  });

  // ========== 测试3: 缓存状态 ==========
  describe('缓存状态', () => {
    beforeEach(() => {
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(TEST_MAPPING, null, 2), 'utf8');
      mappingLoader = require('../mapping-loader');
    });

    test('getCacheStatus 返回正确的缓存信息', () => {
      const status = mappingLoader.getCacheStatus();
      
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('cached');
      expect(status).toHaveProperty('lastLoadTime');
      expect(status).toHaveProperty('remapEntries');
    });

    test('reload 重新加载映射表', () => {
      const status1 = mappingLoader.getCacheStatus();
      
      // 修改文件
      const newMapping = {
        ...TEST_MAPPING,
        category_remap: {
          ...TEST_MAPPING.category_remap,
          specialized: {
            ...TEST_MAPPING.category_remap.specialized,
            "New Agent": "new_category"
          }
        }
      };
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(newMapping, null, 2), 'utf8');
      
      const result = mappingLoader.reload();
      
      expect(result.enabled).toBe(true);
      expect(result.remapCount).toBeGreaterThan(
        Object.keys(TEST_MAPPING.category_remap.specialized).length
      );
    });
  });

  // ========== 测试4: 错误处理 ==========
  describe('错误处理', () => {
    test('无效的 JSON 格式', () => {
      fs.writeFileSync(MAPPING_FILE, 'invalid json {', 'utf8');
      
      // 应该不抛出异常，而是返回禁用状态
      mappingLoader = require('../mapping-loader');
      
      expect(mappingLoader.isMappingEnabled()).toBe(false);
    });

    test('缺少 category_remap 字段', () => {
      const noRemapMapping = {
        _enabled: true,
        category_remap: null
      };
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(noRemapMapping, null, 2), 'utf8');
      
      mappingLoader = require('../mapping-loader');
      
      // 应该启用，但映射结果应该是原分类
      expect(mappingLoader.isMappingEnabled()).toBe(true);
      const result = mappingLoader.getMappedCategory('specialized', 'Some Agent');
      expect(result.wasMapped).toBe(false);
    });
  });
});
