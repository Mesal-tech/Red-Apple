declare module '@langchain/langgraph/prebuilt' {
  export class ToolNode {
    constructor(tools: any[]);
    invoke(state: any, config?: any): Promise<any>;
  }
  export function toolsCondition(state: any): string;
}
