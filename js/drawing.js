var paper = null;

var PIXELS_PER_UNIT_LOAD = 5;

function drawGrid() {
  var bg = paper.rect(0, 0, w, h);
  bg.attr({fill: '#555'});

  var minor = paper.set();
  for (var x = gridspace/2; x <= w; x += gridspace) {
    minor.push(paper.path('M '+x+' 0 V '+h));
  }
  for (var y = gridspace/2; y <= h; y += gridspace) {
    minor.push(paper.path('M 0 '+y+' H '+w));
  }
  minor.attr({stroke: '#606060', 'fill-width': 1});

  var major = paper.set();
  for (var x = 0; x <= w; x += gridspace) {
    major.push(paper.path('M '+x+' 0 V '+h));
  }
  for (var y = 0; y <= h; y += gridspace) {
    major.push(paper.path('M 0 '+y+' H '+w));
  }
  major.attr({stroke: '#777', 'fill-width': 1});

  var overlay = paper.rect(0, 0, w, h);
  overlay.attr({fill: '#000', 'fill-opacity': 0});

  bg.click(bgClick);
  overlay.click(bgClick);
}

function createNodeEl(x, y, s) {
  var el = paper.circle(x, y, 10);
  el.attr('fill','yellow');
  el.dclSerial = s;
  el.dclType = 'node';
  el.drag(nodeDragMove, nodeDragStart, nodeDragEnd);
  el.click(nodeClick);

  return el;
}

    function memberPath(node1, node2) {
      return [['M', node1.x, node1.y], ['L', node2.x, node2.y]];
    }

function createMemberEl(node1, node2, s) {
  var el = paper.path(memberPath(node1, node2));
  el.attr({
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke': '#eee'
  });
  el.dclSerial = s;
  el.dclType = 'member';

  el.click(memberClick);
  nodesToFront();
  return el;
}

function createSupportEl(node, vertical, s) {
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

  nodesToFront();
  return el;
}

    function humanAngle(angle) {
      angle = Math.abs(angle * 180 / Math.PI);
      if (angle > 90)
        angle = 180 - angle;
      return Math.round(angle)+" deg";
    }

function createLoadEls(node, val, angle, s) {
  var dx = Math.cos(angle) * val * PIXELS_PER_UNIT_LOAD;
  var dy = Math.sin(angle) * val * PIXELS_PER_UNIT_LOAD;

  var el = paper.path([
    ['M', node.x, node.y],
    ['l', dx, dy]
  ]);
  el.attr({
    'stroke-width': 3,
    'stroke': '#f00',
    'arrow-end': 'classic-wide-long',
  });
  var textEl = paper.text(node.x+dx, node.y+dy, val + " N, " + humanAngle(angle));
  textEl.attr({
    'fill': '#fff',
    'font-size': 16
  });
  textEl = createShadowedSet(textEl);

  el.dclSerial = textEl.dclSerial = s;
  el.dclType = textEl.dclType = 'load';

  el.click(loadClick);
  textEl.click(loadClick);

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
  paper.renderfix();
  drawGrid();
});