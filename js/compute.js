var noCompute = false;
var computeMode = 'forces';

function stopComputing() {
  noCompute = true;
}

function startComputing() {
  noCompute = false;
  recompute();
}

    function zeros(n, m) {
      var r = [];
      if (m) {
        for (var i = 0; i < n; ++i)
          r[i] = zeros(m);
      } else {
        for (var i = 0; i < n; ++i)
          r[i] = 0;
      }
      return r;
    }

    function otherNode(member, node) {
      if (member.node1 == node)
        return member.node2;
      else if (member.node2 == node)
        return member.node1;
      else {
        if (confirm("Error -- node not in member?"))
          debugger;
      }
    }

    // compute angle emanating from node, as radians CW from EAST
    // output in range [-pi, pi]
    function memberAngle(member, node) {
      var other = otherNode(member, node);
      var dx = other.x - node.x;
      var dy = other.y - node.y;
      return Math.atan2(dy, dx);
    }

function recompute() {
  if (noCompute)
    return;

  //////
  // a de-facto place to put on-model-change hooks
  invalidatePermalink();
  //////

  if (computeMode == 'forces') {
    computeForces();
  } else if (computeMode == 'lengths') {
    computeLengths();
  }
}

function computeForces() {
  var serialToIdx = {}; // unknown to x_idx
  var idxToSerial = {}; // unknown to x_idx
  var idxToType = {};

  var idx = 0;
  _.each(supports, function(support) {
    serialToIdx[support.serial] = idx;
    idxToSerial[idx] = support.serial;
    idxToType[idx] = 'support';

    ++idx;
  });
  _.each(members, function(member) {
    serialToIdx[member.serial] = idx;
    idxToSerial[idx] = member.serial;
    idxToType[idx] = 'member';

    ++idx;
  });
  var nDims = idx;


  // Begin filling matrix and vector
  //
  // matA x = vecB
  // x = matA^-1 vecB
  var matA = [];
  var vecB = zeros(nDims, nDims);

  // the next row to populate
  var row = 0;


  /*{
    var coeffsSumX = zeros(nDims);
    var coeffsSumY = zeros(nDims);
    var coeffsSumMZ = zeros(nDims);
    // for moment calculation, moment center is at 0,0 (upper left)
    _.each(supports, function(support) {
      idx = serialToIdx[support.serial];
      if (support.vertical) {
        coeffsSumY[idx] = -1;
        coeffsSumMZ[idx] = support.node.x;
      } else {
        coeffsSumX[idx] = 1;
        coeffsSumMZ[idx] = support.node.y;
      }
    });

    var loadSumX = 0;
    var loadSumY = 0;
    var loadSumMZ = 0;
    _.each(loads, function(load) {
      loadSumX += load.compX;
      loadSumY += load.compY;
      loadSumMZ += load.compX * load.node.y;
      loadSumMZ += load.compY * load.node.x;
    });

    matA[row] = coeffsSumX;
    vecB[row] = -loadSumX;
    ++row;

    matA[row] = coeffsSumY;
    vecB[row] = -loadSumY;
    ++row;

    matA[row] = coeffsSumMZ;
    vecB[row] = -loadSumMZ;
    ++row;
  }*/


  _.each(nodes, function(node) {
    var coeffsSumX = zeros(nDims);
    var coeffsSumY = zeros(nDims);
    _.each(node.members, function(member) {
      idx = serialToIdx[member.serial];
      coeffsSumX[idx] = Math.cos(memberAngle(member, node));
      coeffsSumY[idx] = Math.sin(memberAngle(member, node));
    });
    _.each(node.supports, function(support) {
      idx = serialToIdx[support.serial];
      if (support.vertical) {
        coeffsSumY[idx] = -1;
      } else {
        coeffsSumX[idx] = 1;
      }
    });

    var loadSumX = 0;
    var loadSumY = 0;
    _.each(node.loads, function(load) {
      loadSumX += load.compX;
      loadSumY += load.compY;
    });

    matA[row] = coeffsSumX;
    vecB[row] = -loadSumX;
    ++row;

    matA[row] = coeffsSumY;
    vecB[row] = -loadSumY;
    ++row;
  });



  // Display equations

  var str = '';
  /*for (var i = 0; i < nDims; ++i) {
    str += "x<sub>"+i+"</sub> = force on "+idxToType[i]+idxToSerial[i]+"<br/>\n";
  }
  str += "Overall Equilibrium<br/>\n";*/

  str += "<table><tr>";
  for (var i = 0; i < nDims; ++i) {
    str += "<td colspan=3>"+idxToType[i]+idxToSerial[i]+"</td>";
    str += "<td colspan=1></td>";
  }
  str += "</tr>";
  for (var r = 0; r < matA.length; ++r) {
    str += "<tr>";
    for (var c = 0; c < matA[r].length; ++c) {
      if (c != 0)
        str += "<td>+</td>";

      if (matA[r][c] < 1e-5) {
        str += "<td></td>";
        str += "<td></td>";
        str += "<td></td>";
      } else {
        str += "<td>(</td>";
        str += "<td>"+matA[r][c].toFixed(4)+"</td>";
        str += "<td>)x<sub>"+(c+1)+"</sub></td>";
      }
    }
    str += "<td>=</td>";
    str += "<td>"+vecB[r].toFixed(2)+"</td>";
    str += "</tr>";
  }
  str += "</table><br/>\n";

  $('#console2').html(str);


  var vecXvalues;
  var vecXlabels;
  if (nDims > 0) {
    if (nDims == matA.length) {
      // Matrix computation
      // Ax = B
      // x = (A^-1)B

      var matAinv = $M(matA).inv();
      if (matAinv) {
        vecXvalues = matAinv.multiply($V(vecB)).elements;

        vecXlabels = [];
        for (var i = 0; i < nDims; ++i) {
          vecXlabels[i] = vecXvalues[i].toFixed(0) + " N";
        }
      }
    } else {
      $('#console2').append('<p>Number of equations does not match number of unknowns</p>');
    }
  }

  if (!vecXvalues) {
    $('#console2').append('<p>System of equations cannot be solved</p>');
    vecXvalues = [];
    vecXlabels = [];
    for (var i = 0; i < nDims; ++i) {
      vecXvalues[i] = 0;
      vecXlabels[i] = '';
    }
  }


  // Display results
  for (var i = 0; i < nDims; ++i) {
    var type = idxToType[i];
    var serial = idxToSerial[i];
    if (type == 'member') {
      var color = COLORS.memberForceZero;
      var EPSILON = 1e-5;
      if (vecXvalues[i] > EPSILON) {
        color = COLORS.memberForceTension;
      } else if (vecXvalues[i] < -EPSILON) {
        color = COLORS.memberForceCompression;
      }

      updateMemberLabel(members[serial], vecXlabels[i], color);
    } else if (type == 'support') {
      updateSupportLabel(supports[serial], vecXlabels[i]);
    } else {
      if(confirm("???")) debugger;
    }
  }
}

function computeLengths() {
  _.each(members, function(member) {
    var dx = member.node1.x - member.node2.x;
    var dy = member.node1.y - member.node2.y;
    var dist = Math.sqrt(dx*dx + dy*dy) / (gridspace/2);
    var label = dist.toFixed(2) + " cm";
    var color = COLORS.memberLength;
    updateMemberLabel(member, label, color);
  });
  _.each(supports, function(support) {
    updateSupportLabel(support, '');
  });
}

