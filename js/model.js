var nodes = {};
var members = {};
var supports = {};
var loads = {};
var serial = 1000;

function createNode(x, y) {
  var s = ++serial;
  nodes[s] = {
    serial: s,
    el: createNodeEl(x, y, s),
    x: x,
    y: y,
    members: {},
    supports: {},
    loads: {},
    supportType: 0
  };

  nodesToFront();
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

    function findMember(node1, node2) {
      return _.find(node1.members, function(member) {
        return otherNode(member, node1) == node2;
      });
    }

function createMember(node1, node2) {
  if (findMember(node1, node2))
    return;

  var s = ++serial;
  var member = members[s] = {
    serial: s,
    el: createMemberEl(node1, node2, s),
    node1: node1,
    node2: node2
  };
  node1.members[s] = member;
  node2.members[s] = member;

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
  var support = supports[s] = {
    serial: s,
    el: createSupportEl(node, vertical, s),
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

function createLoad(node, val, angle) {
  var s = ++serial;

  var compX = Math.cos(angle) * val;
  var compY = Math.sin(angle) * val;

  var els = createLoadEls(node, val, angle, s);
  var load = loads[s] = {
    serial: s,
    el: els.el,
    textEl: els.textEl,
    node: node,
    compX: compX,
    compY: compY,
    val: val,
    angle: angle
  };
  node.loads[s] = load;

  nodesToFront();
}
function deleteLoad(load) {
  delete load.node.loads[load.serial];
  load.el.remove();
  load.textEl.remove();
  delete loads[load.serial];
}
