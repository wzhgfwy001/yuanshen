/**
 * Brain Module for YangShen
 * Manages context, memory, and learning
 */

class Brain {
  constructor() {
    this.state = {
      context: {
        currentTask: null,
        activeAgents: [],
        lastUpdated: new Date().toISOString()
      },
      memory: {
        shortTerm: [],
        longTerm: []
      }
    };
  }
  
  updateContext(task, agents) {
    this.state.context.currentTask = task;
    this.state.context.activeAgents = agents;
    this.state.context.lastUpdated = new Date().toISOString();
  }
  
  getContext() {
    return this.state.context;
  }
  
  addToShortTerm(item) {
    this.state.memory.shortTerm.push({
      data: item,
      timestamp: new Date().toISOString()
    });
    // 保持短记忆不超过100条
    if (this.state.memory.shortTerm.length > 100) {
      this.state.memory.shortTerm.shift();
    }
  }
  
  addToLongTerm(item) {
    this.state.memory.longTerm.push({
      data: item,
      timestamp: new Date().toISOString()
    });
  }
  
  getMemory(type = 'shortTerm') {
    return this.state.memory[type] || [];
  }
  
  clearShortTerm() {
    this.state.memory.shortTerm = [];
  }
}

module.exports = { Brain };