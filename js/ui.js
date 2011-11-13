
var paper = null;
var mode = 'select';

function drawGrid() {
  var bg = paper.rect(0, 0, w, h);
  bg.attr({fill: '#555'});
  bg.click(bgClick);

  var st = paper.set();
  for (var x = 0; x <= w; x += gridspace) {
    st.push(paper.path('M '+x+' 0 L '+x+' '+h));
  }
  for (var y = 0; y <= h; y += gridspace) {
    st.push(paper.path('M 0 '+y+' L '+w+' '+y));
  }
  st.attr({stroke: '#ccc', 'stroke-width': 1});
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

      //recompute();
      break;
  }
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

  $('#compute-btn').button().click(function() {
    recompute();
  });

  function setSelection(name) {
    mode = name;
    $('button').removeClass('active');
    $('button#'+name).addClass('active');
  }

  setSelection('add-node-btn');
});
