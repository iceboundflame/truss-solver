var nodes = {};
var members = {};
var supports = {};
var loads = {};
var serial = 1000;

function createNode(x, y) {
  var s = ++serial;
  var el = paper.circle(x, y, 10);
  el.attr('fill','yellow');
  el.dclSerial = s;
  el.dclType = 'node';
  nodes[s] = {
    serial: s,
    el: el,
    x: x,
    y: y,
    members: {},
    supports: {},
    loads: {},
    supportType: 0
  };

  el.drag(nodeDragMove, nodeDragStart, nodeDragEnd);
  el.click(nodeClick);
}

function deleteNode(node) {
  node.el.remove();
  delete nodes[node.serial];

  // remove members
  _.each(node.members, function(member) {
    deleteMember(member);
  });
  // remove supports
  _.each(node.supports, function(support) {
    deleteSupport(support);
  });
  // remove loads
  _.each(node.loads, function(load) {
    deleteLoad(load);
  });
}

function memberPath(node1, node2) {
  return [['M', node1.x, node1.y], ['L', node2.x, node2.y]];
}

function createMember(node1, node2) {
  var s = ++serial;
  var el = paper.path(memberPath(node1, node2));
  el.attr({
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke': '#eee'
  });
  el.dclSerial = s;
  el.dclType = 'member';
  var member = members[s] = {
    serial: s,
    el: el,
    node1: node1,
    node2: node2
  };
  node1.members[s] = member;
  node2.members[s] = member;

  el.click(memberClick);
  nodesToFront();
}
function deleteMember(member) {
  delete member.node1.members[member.serial];
  delete member.node2.members[member.serial];
  member.el.remove();
  if (member.textEl)
    member.textEl.remove();
  delete members[member.serial];
}


function createSupport(node, vertical) {
  var s = ++serial;
  var el = paper.path([
    ['M', node.x, node.y],
    vertical ? ['l', 0, -50] : ['l', 50, 0]
  ]);
  el.attr({
    'stroke-width': 5,
    'stroke': '#99f',
    'arrow-end': 'classic',
  });
  el.dclSerial = s;
  el.dclType = 'support';
  var support = supports[s] = {
    serial: s,
    el: el,
    node: node,
    vertical: vertical
  };
  node.supports[s] = support;

  nodesToFront();
}
function deleteSupport(support) {
  delete support.node.supports[support.serial];
  support.el.remove();
  if (support.textEl)
    support.textEl.remove();
  delete supports[support.serial];
}


      var PIXELS_PER_UNIT_LOAD = 5;
      var UNIT_ANGLE = 15 / 180 * Math.PI; // 15 degree snap

function humanAngle(angle) {
  angle = Math.abs(angle * 180 / Math.PI);
  if (angle > 90)
    angle = 180 - angle;
  return Math.round(angle)+" deg";
}

function createLoad(node, val, angle) {
  var s = ++serial;

  var compX = Math.cos(angle) * val;
  var compY = Math.sin(angle) * val;
  var dx = compX * PIXELS_PER_UNIT_LOAD;
  var dy = compY * PIXELS_PER_UNIT_LOAD;

  var els = createLoadEls(node, val, angle);
  var el = els.el, textEl = els.textEl;

  textEl.dclSerial = el.dclSerial = s;
  textEl.dclType = el.dclType = 'load';

  var load = loads[s] = {
    serial: s,
    el: el,
    textEl: textEl,
    node: node,
    compX: compX,
    compY: compY,
    val: val,
    angle: angle
  };
  node.loads[s] = load;

  el.click(loadClick);
  textEl.click(loadClick);
  nodesToFront();
}
function deleteLoad(load) {
  delete load.node.loads[load.serial];
  load.el.remove();
  load.textEl.remove();
  delete loads[load.serial];
}
