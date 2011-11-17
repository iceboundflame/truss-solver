
var paper = null;
var mode = 'select';

function drawGrid() {
  var bg = paper.rect(0, 0, w, h);
  bg.attr({fill: '#555'});
  //bg.click(bgClick);

  var st = paper.set();
  for (var x = 0; x <= w; x += gridspace) {
    st.push(paper.path('M '+x+' 0 L '+x+' '+h));
  }
  for (var y = 0; y <= h; y += gridspace) {
    st.push(paper.path('M 0 '+y+' L '+w+' '+y));
  }
  st.attr({stroke: '#ccc', 'stroke-width': 1});

  var overlay = paper.rect(0, 0, w, h);
  overlay.attr({fill: '#000', 'fill-opacity': 0});
  overlay.click(bgClick);
}

function bgClick(event) {
  var x = event.layerX;
  var y = event.layerY;

  if (mode == 'add-node-btn') {
    createNode(x, y);
  }
}

function nodeClick(event, x, y) {
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      if (event.which != 1) {
        deleteNode(node);
      }
      break;

    case 'add-support-btn':
      node.supportType = (node.supportType + 1) % 4;

      _.each(node.supports, function(support) {
        deleteSupport(support);
      });

      if (node.supportType & 1) {
        createSupport(node, true);
      }
      if (node.supportType & 2) {
        createSupport(node, false);
      }
      break;
  }
  recompute();
}

function memberClick(event, x, y) {
  switch(mode) {
    case 'arrow-btn':
    case 'add-member-btn':
      if (event.which != 1) {
        deleteMember(members[this.dclSerial]);
      }
      break;
  }
  recompute();
}

function loadClick(event, x, y) {
  switch (mode) {
    case 'arrow-btn':
    case 'add-load-btn':
      if (event.which != 1) {
        deleteLoad(loads[this.dclSerial]);
      }
      break;
  }
  recompute();
}

var ghostMember = null;
var ghostLoad = null;

function nodeDragStart(x, y, event) {
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      this.attr({'fill-opacity': 0.5});

      this.dclLastDx = 0;
      this.dclLastDy = 0;
      this.dclOX = this.attr('cx');
      this.dclOY = this.attr('cy');

      break;

    case 'add-member-btn':
      var path = [['M', node.x, node.y], ['l', 0, 0]];
      ghostMember = paper.path(path);
      ghostMember.attr({
        stroke: 'green',
        'stroke-width': 5
      });
      ghostMember.dclNode1 = node;
      nodesToFront();

      break;

    case 'add-load-btn':
      _.each(node.loads, function(load) {
        deleteLoad(load);
      });

      var path = [['M', node.x, node.y], ['l', 0, 0]];
      ghostLoad = createLoadEls(node, 0, 0);
      ghostLoad.dclNode = node;
      ghostLoad.dclValue = 0;
      ghostLoad.dclAngle = 0;
      break;
  }
}
function nodeDragEnd(event) {
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      this.attr({'fill-opacity': 1});
      break;

    case 'add-member-btn':
      var hit = paper.getElementByPoint(event.x, event.y);
      if (hit && hit.dclType == 'node') {
        createMember(ghostMember.dclNode1, nodes[hit.dclSerial]);
      }

      ghostMember.remove();
      break;

    case 'add-load-btn':
      if (ghostLoad.dclValue > 0) {
        createLoad(ghostLoad.dclNode, ghostLoad.dclValue, ghostLoad.dclAngle);
      }
      ghostLoad.el.remove();
      ghostLoad.textEl.remove();
      break;
  }
  recompute();
}
function nodeDragMove(dx, dy, x, y, event) {
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      var cx = this.dclOX+dx;
      var cy = this.dclOY+dy;
      this.attr({cx: cx, cy: cy});

      node.x = cx;
      node.y = cy;

      _.each(node.members, function(member) {
        member.el.attr('path', memberPath(member.node1, member.node2));
      });

      var that = this;
      _.each(node.supports, function(support) {
        support.el.translate(dx-that.dclLastDx, dy-that.dclLastDy);
      });
      _.each(node.loads, function(load) {
        load.el.translate(dx-that.dclLastDx, dy-that.dclLastDy);
        load.textEl.translate(dx-that.dclLastDx, dy-that.dclLastDy);
      });

      this.dclLastDx = dx;
      this.dclLastDy = dy;
      break;

    case 'add-member-btn':
      var path = ghostMember.attr('path');
      path[1] = ['l', dx, dy];
      ghostMember.attr('path', path);
      break;

    case 'add-load-btn':
      var val = Math.round(Math.sqrt(dy*dy + dx*dx) / PIXELS_PER_UNIT_LOAD);
      var angle = Math.round(Math.atan2(dy,dx) / UNIT_ANGLE) * UNIT_ANGLE;

      ghostLoad.el.remove();
      ghostLoad.textEl.remove();
      ghostLoad = createLoadEls(node, val, angle);
      ghostLoad.dclNode = node;
      ghostLoad.dclValue = val;
      ghostLoad.dclAngle = angle;

      break;
  }

  recompute();
}

function createLoadEls(node, val, angle) {
  var dx = Math.cos(angle) * val * PIXELS_PER_UNIT_LOAD;
  var dy = Math.sin(angle) * val * PIXELS_PER_UNIT_LOAD;

  var el = paper.path([
    ['M', node.x, node.y],
    ['l', dx, dy]
  ]);
  el.attr({
    'stroke-width': 5,
    'stroke': '#f00',
    'arrow-end': 'classic',
  });
  var textEl = paper.text(node.x+dx, node.y+dy, val + " N, " + humanAngle(angle));
  textEl.attr({
    'fill': '#fff',
    'font-size': 16
  });
  textEl = createShadowedSet(textEl);

  nodesToFront();
  return {el: el, textEl: textEl};
}

function createShadowedSet(el, offset, blur, fill) {
  if (!offset) offset = 1;
  if (!blur) blur = 3;
  if (!fill) fill = '#000';

  var topEl = el.clone();
  el.attr({fill: fill});
  el.translate(offset, offset);
  el.blur(blur);

  var set = paper.set();
  set.push(el, topEl);
  return set;
}

function memberMidpoint(member) {
  return [(member.node1.x + member.node2.x)/2,
    (member.node1.y + member.node2.y)/2];
}

function updateMemberLabel(member, label) {
  if (member.textEl)
    member.textEl.remove();
  var mid = memberMidpoint(member);
  var textEl = paper.text(mid[0], mid[1], label);
  textEl.attr({
    'fill': '#fff',
    'font-size': 16
  });
  member.textEl = createShadowedSet(textEl);
}
function updateSupportLabel(support, label) {
  if (support.textEl)
    support.textEl.remove();
  var pt = support.vertical
    ? [support.node.x, support.node.y - 50]
    : [support.node.x + 50, support.node.y];
  var textEl = paper.text(pt[0], pt[1], label);
  textEl.attr({
    'fill': '#fff',
    'font-size': 16
  });
  support.textEl = createShadowedSet(textEl);
}


function nodesToFront() {
  _.each(members, function(x) {
    x.el.toFront();
    if (x.textEl) x.textEl.toFront();
  });
  _.each(supports, function(x) {
    x.el.toFront();
  });
  _.each(loads, function(x) {
    x.el.toFront();
    if (x.textEl) x.textEl.toFront();
  });
  _.each(supports, function(x) {
    if (x.textEl) x.textEl.toFront();
  });
  _.each(nodes, function(node) {
    node.el.toFront();
  });
}


$(function(){
  paper = Raphael('canvas', w, h);
  drawGrid();
});

$(function() {
  $('#arrow-btn').button().click(function() {
    setSelection('arrow-btn');
  });
  $('#add-node-btn').button().click(function() {
    setSelection('add-node-btn');
  });
  $('#add-member-btn').button().click(function() {
    setSelection('add-member-btn');
  });
  $('#add-support-btn').button().click(function() {
    setSelection('add-support-btn');
  });
  $('#add-load-btn').button().click(function() {
    setSelection('add-load-btn');
  });

  function setSelection(name) {
    mode = name;
    $('button').removeClass('active');
    $('button#'+name).addClass('active');
  }

  setSelection('add-node-btn');
});
