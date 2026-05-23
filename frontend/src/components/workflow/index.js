/**
 * 工作流组件导出
 */
import StartNode from './NodeTypes/StartNode';
import EndNode from './NodeTypes/EndNode';
import SmallModelNode from './NodeTypes/SmallModelNode';
import GraphQueryNode from './NodeTypes/GraphQueryNode';
import PropertyPanel from './PropertyPanel';

export {
  StartNode,
  EndNode,
  SmallModelNode,
  GraphQueryNode,
  PropertyPanel,
};

export const nodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  smallModelNode: SmallModelNode,
  graphQueryNode: GraphQueryNode,
};
