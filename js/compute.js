
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

function recompute() {
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
  var matA = zeros(nDims, nDims);
  var vecB = zeros(nDims, nDims);

  // the next row to populate
  var row = 0;


  var str = '';
  /*for (var i = 0; i < nDims; ++i) {
    str += "x<sub>"+i+"</sub> = force on "+idxToType[i]+idxToSerial[i]+"<br/>\n";
  }

  str += "Overall Equilibrium<br/>\n";*/

  {
    var coeffsSumX = zeros(nDims);
    var coeffsSumY = zeros(nDims);
    var coeffsSumMZ = zeros(nDims);
    // for moment calculation, moment center is at 0,0 (upper left)
    _.each(supports, function(support) {
      idx = serialToIdx[support.serial];
      if (support.vertical) {
        coeffsSumY[idx] = 1;
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
  }

  // compute angle emanating from node, as radians CCW from EAST
  function memberAngle(member, node) {
    // FIXME
    console.log("FAKE MEMBERANGLE");
    return Math.PI/4;
  }


  _.each(nodes, function(node) {
    var coeffsSumX = zeros(nDims);
    var coeffsSumY = zeros(nDims);
    _.each(members, function(member) {
      idx = serialToIdx[member.serial];
      coeffsSumX[idx] = Math.cos(memberAngle(member, node));
      coeffsSumY[idx] = Math.sin(memberAngle(member, node));
    });
    _.each(supports, function(support) {
      idx = serialToIdx[support.serial];
      if (support.vertical) {
        coeffsSumY[idx] = 1;
      } else {
        coeffsSumX[idx] = 1;
      }
    });

    var loadSumX = 0;
    var loadSumY = 0;
    _.each(loads, function(load) {
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
      str += "<td>(</td>";

      str += "<td>"+matA[r][c]+"</td>";
      str += "<td>)x<sub>"+(c+1)+"</sub></td>";
    }
    str += "<td>=</td>";
    str += "<td>"+vecB[r]+"</td>";
    str += "</tr>";
  }
  str += "</table><br/>\n";



  $('#console2').html(str);
}


