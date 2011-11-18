var nodes = {};
var members = {};
var supports = {};
var loads = {};
var serial = 1000;

function resetModel() {
  _.each(nodes, function(node) {
    deleteNode(node); // will delete attached members, supports, loads
  });
  serial = 1000;
}

function loadData(blob) {
  resetModel();

  var data = JSON.parse(
    lzw_decode(Base64.decode(blob))
  );

  var frozenNodeSerialToLiveNode = {};
  _.each(data.nodes, function(fnode) { //fnode = frozen node
    createNode(fnode.x, fnode.y);
    lnode = nodes[serial];
    lnode.supportType = fnode.supportType;
    frozenNodeSerialToLiveNode[fnode.serial] = lnode;
  });
  _.each(data.members, function(fmember) {
    var node1 = frozenNodeSerialToLiveNode[fmember.node1];
    var node2 = frozenNodeSerialToLiveNode[fmember.node2];
    createMember(node1, node2);
  });
  _.each(data.supports, function(fsupport) {
    var node = frozenNodeSerialToLiveNode[fsupport.node];
    createSupport(node, fsupport.vertical);
  });
  _.each(data.loads, function(fload) {
    var node = frozenNodeSerialToLiveNode[fload.node];
    createLoad(node, fload.val, fload.angle);
  });

  recompute();
}

function saveData() {
  return Base64.encode(lzw_encode(
    JSON.stringify({
      nodes: _.map(nodes, function(node) {
        return {
          serial: node.serial,
          x: node.x,
          y: node.y,
          supportType: node.supportType
        };
      }),
      members: _.map(members, function(member) {
        return {
          node1: member.node1.serial,
          node2: member.node2.serial
        };
      }),
      supports: _.map(supports, function(support) {
        return {
          node: support.node.serial,
          vertical: support.vertical
        };
      }),
      loads: _.map(loads, function(load) {
        return {
          node: load.node.serial,
          val: load.val,
          angle: load.angle
        };
      })
    })
  ));
}

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
  recompute();
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

  recompute();
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
  recompute();
}
function deleteMember(member) {
  delete member.node1.members[member.serial];
  delete member.node2.members[member.serial];
  member.el.remove();
  if (member.textEl)
    member.textEl.remove();
  delete members[member.serial];

  recompute();
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
  recompute();
}
function deleteSupport(support) {
  delete support.node.supports[support.serial];
  support.el.remove();
  if (support.textEl)
    support.textEl.remove();
  delete supports[support.serial];

  recompute();
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
  recompute();
}
function deleteLoad(load) {
  delete load.node.loads[load.serial];
  load.el.remove();
  load.textEl.remove();
  delete loads[load.serial];

  recompute();
}

function createPermalink() {
  $('#blob').val(window.location.href.split('#')[0]+'#'+saveData());
}
function invalidatePermalink() {
  $('#blob').val('');
}

$(function() {
  $(window).hashchange(function() {
    if (window.location.hash) {
      loadData(window.location.hash.substring(1));
    }
  }).hashchange();

  $('#clear-btn').button().click(function() {
    if (confirm("Clearing the screen will erase everything you've done so far.")) {
      resetModel();
    }
  });
  $('#recompute-blob-btn').button().click(function() {
    createPermalink();
  });
  $('#blob').click(function() {
    this.select();
  });
});
