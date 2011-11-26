var mode = 'select';

var NODE_SNAP = gridspace/4;
var UNIT_ANGLE = 15 / 180 * Math.PI; // 15 degree snap

// N.B. don't think this works with Sets
function rightClickify(raphaelEl, handler) {
  $(raphaelEl.node).bind('contextmenu', function(e) {
    handler.apply(raphaelEl, [e, e.x, e.y]);
    return false;
  });
}

// JS mouse handling is insane
// See http://unixpapa.com/js/mouse.html
function canvasCoords(pageX, pageY) {
  var off = $('#canvas').offset();
  return [pageX - off.left, pageY - off.top];
}
function fixEventCoords(event) {
  // Calculate pageX/Y if missing and clientX/Y available
  if ( event.pageX == null && event.clientX != null ) {
    var doc = document.documentElement, body = document.body;
    event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0)
                    - (doc && doc.clientLeft || body && body.clientLeft || 0);
    event.pageY = event.clientY + (doc && doc.scrollTop  || body && body.scrollTop  || 0)
                    - (doc && doc.clientTop  || body && body.clientTop  || 0);
  }

  var xy = canvasCoords(event.pageX, event.pageY);
  event.dclCanvasX = xy[0];
  event.dclCanvasY = xy[1];
}
function isLeftClick(event) {
  if (event.which == null) /* IE case */
    return (event.button < 2);
  else /* All others */
    return (event.which < 2);
}

// Event handlers

function bgClick(event) {
  fixEventCoords(event);
  var x = event.dclCanvasX;
  var y = event.dclCanvasY;

  if (!event.shiftKey) {
    x = Math.round(x / NODE_SNAP) * NODE_SNAP;
    y = Math.round(y / NODE_SNAP) * NODE_SNAP;
  }

  if (mode == 'add-node-btn') {
    createNode(x, y);
  }
}

function nodeClick(event) {
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      /*if (event.which != 1) {*/
      if (!isLeftClick(event) || event.ctrlKey) {
        deleteNode(node);
      }
      break;

    case 'add-support-btn':
      node.supportType = (node.supportType - 1) % 4;

      _.each(node.supports, function(support) {
        deleteSupport(support);
      });

      if (node.supportType & 1) {
        createSupport(node, false);
      }
      if (node.supportType & 2) {
        createSupport(node, true);
      }
      break;
  }
  recompute();
}

function memberClick(event) {
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

function loadClick(event) {
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
        stroke: COLORS.ghostMember,
        'stroke-width': SIZES.memberWidth
      });
      nodesToFront();

      break;

    case 'add-load-btn':
      _.each(node.loads, function(load) {
        deleteLoad(load);
      });

      var path = [['M', node.x, node.y], ['l', 0, 0]];
      ghostLoad = createLoadEls(node, 0, 0);
      ghostLoad.dclValue = 0;
      ghostLoad.dclAngle = 0;
      break;
  }
}

function nodeDragEnd(event) {
  fixEventCoords(event);
  var node = nodes[this.dclSerial];
  switch(mode) {
    case 'arrow-btn':
    case 'add-node-btn':
      this.attr({'fill-opacity': 1});
      break;

    case 'add-member-btn':
      var hit = paper.getElementByPoint(event.pageX, event.pageY);
      if (hit && hit.dclType == 'node' &&
          nodes[hit.dclSerial] != node)
      {
        createMember(node, nodes[hit.dclSerial]);
      }

      ghostMember.remove();
      break;

    case 'add-load-btn':
      if (ghostLoad.dclValue > 0) {
        createLoad(node, ghostLoad.dclValue, ghostLoad.dclAngle);
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
      if (!event.shiftKey) {
        cx = Math.round(cx / NODE_SNAP) * NODE_SNAP;
        cy = Math.round(cy / NODE_SNAP) * NODE_SNAP;
        dx = cx - this.dclOX;
        dy = cy - this.dclOY;
      }

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
      var angle = Math.atan2(dy,dx);
      if (!event.shiftKey)
        angle = Math.round(angle / UNIT_ANGLE) * UNIT_ANGLE;

      ghostLoad.el.remove();
      ghostLoad.textEl.remove();
      ghostLoad = createLoadEls(node, val, angle);
      ghostLoad.dclValue = val;
      ghostLoad.dclAngle = angle;

      break;
  }

  recompute();
}


$(function(){
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
  $('#toggle-compute-btn').button().click(function() {
    if (computeMode == 'lengths') {
      computeMode = 'forces';
    } else {
      computeMode = 'lengths';
    }
    recompute();
  });

  $(document).keydown(function(event) {
    switch (String.fromCharCode(event.keyCode)) {
      case '1':
        setSelection('arrow-btn');
        break;
      case '2':
        setSelection('add-node-btn');
        break;
      case '3':
        setSelection('add-member-btn');
        break;
      case '4':
        setSelection('add-support-btn');
        break;
      case '5':
        setSelection('add-load-btn');
        break;
    }
  });

  function setSelection(name) {
    mode = name;
    $('button').removeClass('active');
    $('button#'+name).addClass('active');
  }

  setSelection('add-node-btn');
});
