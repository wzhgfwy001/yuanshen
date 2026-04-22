// Brain Module for YangShen
// Manages context, memory, and learning

export interface BrainState {
  context: {
    currentTask: string | null;
    activeAgents: string[];
    lastUpdated: string;
  };
  memory: {
    shortTerm: any[];
    longTerm: any[];
  };
}

export class Brain {
  private state: BrainState;
  
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
  
  updateContext(task: string, agents: string[]) {
    this.state.context.currentTask = task;
    this.state.context.activeAgents = agents;
    this.state.context.lastUpdated = new Date().toISOString();
  }
  
  getContext() {
    return this.state.context;
  }
}
