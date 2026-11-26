// Picket core: turn a fence run into a shopping list. Give it the length of
// fence you want, the panel width and the fence height, and it works out how
// many panels and posts to buy, how long the posts need to be, how many bags
// of postmix to set them in, and the gravel boards and caps to finish it. No
// DOM in here, so the same file runs in the page and under `node --test`.
//
// The method is the one fencing suppliers use. Panels go in vertical bays
// between posts, so the number of panels is the run divided by one panel's
// width, rounded up, and you need one more post than panels because there is a
// post at each end as well as between every panel. A corner, a gate or a run
// that ends against a wall can add posts, so you can add extras.
//
// A post is buried about a third of its height, so a 1.83 m (6 ft) fence wants
// a 2.4 m post with roughly 0.6 m in the ground. Postmix (the rapid-set bagged
// concrete you pour in dry) is usually 1 to 2 bags per post in firm ground and
// 2 to 3 in soft ground, a little more for a tall or heavy-duty post, so Picket
// gives a low-to-high range rather than one number.
//
// Figures follow Jacksons Fencing's fence builder and post-setting guidance
// (2 bags in hard ground, 3 in soft or for fences over 1.8 m), Wern-Wood's
// panels/posts/postmix guide (1 to 2 bags per post) and the common trade rule
// of a 2.4 m post for a 1.83 m fence with ~600 mm buried. Panel widths vary by
// make (1.83 m imperial, 1.8 m European), so Picket lets you set the width and
// warns that the last panel may need cutting.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Picket = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PANEL_WIDTH = 1.83;   // m, standard UK imperial panel (6 ft)
  var POST_WIDTH = 100;     // mm, standard 100 x 100 (4 in) timber post
  var FENCE_HEIGHT = 1.83;  // m, the common 6 ft fence
  var BAG_KG = 20;          // kg, a maxi bag of postmix

  // Panel widths people actually buy, so the picker matches the shop.
  var PANEL_PRESETS = [
    { id: "imperial", label: "6 ft (1.83 m)", width: 1.83 },
    { id: "euro",     label: "European (1.80 m)", width: 1.80 },
    { id: "five",     label: "5 ft (1.52 m)", width: 1.52 },
    { id: "four",     label: "4 ft (1.22 m)", width: 1.22 }
  ];

  // Common fence heights, with the post length a buried third works out to.
  var HEIGHT_PRESETS = [
    { id: "h183", label: "6 ft (1.83 m)", height: 1.83 },
    { id: "h150", label: "5 ft (1.50 m)", height: 1.50 },
    { id: "h120", label: "4 ft (1.20 m)", height: 1.20 },
    { id: "h090", label: "3 ft (0.90 m)", height: 0.90 }
  ];

  // Standard post lengths on the shelf. Picket rounds the buried-plus-visible
  // length up to one of these so you buy a real post, not an odd size.
  var STANDARD_POST_LENGTHS = [2.1, 2.4, 2.7, 3.0];

  function round(n, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round(n * f) / f;
  }

  // Pick the first standard post length that clears what you need, or the
  // longest on the list with a note that you will cut it down.
  function standardPostLength(needed) {
    // Allow a small tolerance: the trade sets a 2.4 m post for a 1.83 m fence
    // and buries a touch under a third rather than jumping to a 2.7 m post.
    for (var i = 0; i < STANDARD_POST_LENGTHS.length; i++) {
      if (STANDARD_POST_LENGTHS[i] >= needed - 0.05) return STANDARD_POST_LENGTHS[i];
    }
    return STANDARD_POST_LENGTHS[STANDARD_POST_LENGTHS.length - 1];
  }

  // Postmix bags per post as a low-to-high range. Firm ground is lighter than
  // soft, and a tall or heavy-duty post wants a bigger, deeper hole, so it adds
  // a bag at each end of the range.
  function bagsPerPost(ground, heavyDuty) {
    var low = ground === "soft" ? 2 : 1;
    var high = ground === "soft" ? 3 : 2;
    if (heavyDuty) { low += 1; high += 1; }
    return { low: low, high: high };
  }

  // The whole estimate. Pass the run length (m) and, optionally, the panel
  // width, post width, fence height, ground firmness, whether the posts are
  // heavy-duty, whether you want gravel boards and caps, and any extra posts
  // for corners, gates or ends against a wall.
  // Ground that falls across the run. A panel fence can't bend, so on a slope
  // the bays are "stepped": each rigid panel is hung level but a step lower than
  // the one uphill of it, which leaves a triangular gap under the downhill end
  // of every panel. That gap is what the gravel board fills. The step per bay is
  // the total fall shared over the bays, and the gap at the downhill end of a
  // panel is that same step. If the step is more than a standard gravel board is
  // tall (about 150 mm), one board won't cover it, so you need a deeper board,
  // two boards, or to rake (angle) the panels to the slope instead.
  var GRAVEL_BOARD_MM = 150;   // a standard concrete/timber gravel board height
  function slopePlan(opts) {
    opts = opts || {};
    var fall = Number(opts.fall);          // total drop across the run, metres
    var panels = Math.floor(Number(opts.panels) || 0);
    if (!(fall > 0) || !(panels > 0)) return null;
    var boardMm = Number(opts.gravelBoardMm) > 0 ? Number(opts.gravelBoardMm) : GRAVEL_BOARD_MM;

    var stepM = fall / panels;
    var stepMm = Math.round(stepM * 1000);
    var run = Number(opts.runLength) > 0 ? Number(opts.runLength) : null;
    var gradientPct = run ? Math.round((fall / run) * 1000) / 10 : null;

    return {
      fall: Math.round(fall * 1000) / 1000,
      panels: panels,
      stepMm: stepMm,
      gapMm: stepMm,              // the triangular gap under each stepped panel
      gravelBoardMm: boardMm,
      needsDeeperBoard: stepMm > boardMm,
      boardsPerBay: Math.max(1, Math.ceil(stepMm / boardMm)),
      gradientPct: gradientPct
    };
  }

  function estimate(opts) {
    opts = opts || {};
    var run = Number(opts.runLength);
    if (!isFinite(run) || run <= 0) run = 0;

    var panelWidth = Number(opts.panelWidth) || PANEL_WIDTH;
    if (panelWidth <= 0) panelWidth = PANEL_WIDTH;
    var postWidth = Number(opts.postWidth) || POST_WIDTH;    // mm
    var height = Number(opts.fenceHeight) || FENCE_HEIGHT;
    var ground = opts.ground === "soft" ? "soft" : "firm";
    var heavyDuty = !!opts.heavyDuty;
    var wantGravelBoards = opts.gravelBoards !== false;
    var wantCaps = opts.postCaps !== false;
    var extraPosts = Math.max(0, Math.floor(Number(opts.extraPosts) || 0));
    // A trellis topper adds height above the panels. It needs taller posts (the
    // trellis height on top of the fence) and one trellis panel per bay.
    var trellisHeight = Math.max(0, Number(opts.trellisHeight) || 0);

    // Panels: how many full panel widths cover the run, rounded up. Posts: one
    // at each end plus one between every pair of panels, which is panels + 1,
    // then any extras you add for corners or gates.
    var panels = run > 0 ? Math.ceil(run / panelWidth - 0.0001) : 0;
    var posts = panels > 0 ? panels + 1 + extraPosts : 0;

    // The last panel usually lands mid-width, so it gets cut. Show the width it
    // is trimmed to and the offcut, so there are no surprises on the saw.
    var lastPanelWidth = panelWidth;
    var offcut = 0;
    if (panels > 0) {
      var remainder = run - (panels - 1) * panelWidth;
      if (remainder > 0 && remainder < panelWidth - 0.001) {
        lastPanelWidth = round(remainder, 3);
        offcut = round(panelWidth - remainder, 3);
      }
    }

    // What the finished fence actually measures, posts included, so you can
    // check it against the gap you are filling.
    var builtLength = panels > 0
      ? round((panels - (offcut > 0 ? 1 : 0)) * panelWidth + lastPanelWidth + posts * (postWidth / 1000), 3)
      : 0;

    // Posts are set about a third of their height into the ground, at least
    // 600 mm for a full-height fence. Add the buried depth to the visible
    // height and round up to a post you can buy off the shelf.
    var burial = Math.max(0.6, round(height / 3, 2));
    if (height <= 1.2) burial = Math.max(0.45, round(height / 3, 2));
    // A trellis topper stands above the panels, so the post has to clear the
    // fence height, the trellis and the buried depth.
    var neededPostLength = round(height + trellisHeight + burial, 2);
    var postLength = standardPostLength(neededPostLength);
    var holeDepth = burial; // the depth to dig; any extra post length is trimmed
    var trellisPanels = trellisHeight > 0 ? panels : 0; // one per bay

    var per = bagsPerPost(ground, heavyDuty);
    var bagsLow = posts * per.low;
    var bagsHigh = posts * per.high;

    // Post holes as a concrete volume, for a long run where you'd mix your own
    // or order ready-mix rather than count postmix bags. The trade digs a hole
    // about three times the post width (a 100 mm post gets a ~300 mm hole) to
    // the buried depth. The concrete that goes in is the hole less the post
    // itself. A heavy-duty or tall post wants a wider hole, so it bumps the
    // multiplier up. This is the same job as the bag range, costed by volume.
    var holeMult = heavyDuty ? 3.5 : 3;
    var holeSideM = (postWidth / 1000) * holeMult;      // square hole side, m
    var postSideM = postWidth / 1000;
    var concretePerHole = (holeSideM * holeSideM - postSideM * postSideM) * holeDepth;
    var totalConcrete = concretePerHole * posts;
    var postHole = {
      sideMm: Math.round(holeSideM * 1000),
      depthMm: Math.round(holeDepth * 1000),
      perHoleM3: round(concretePerHole, 3),
      totalM3: round(totalConcrete, 2),
      totalLitres: Math.round(totalConcrete * 1000)
    };

    var gravelBoards = wantGravelBoards ? panels : 0; // one per bay
    var caps = wantCaps ? posts : 0;

    var notes = [];
    if (offcut > 0) {
      notes.push("The last panel is cut to " + lastPanelWidth.toFixed(2) +
        " m (a " + offcut.toFixed(2) + " m offcut). Closeboard and some panels cut down; a rigid framed panel may not, so you might start from the other end or add a slim bay.");
    }
    notes.push("Panel widths vary by make (6 ft is 1.83 m, European panels are 1.80 m). Over a long run the difference adds up, so check the panel before you buy the posts.");
    if (height >= 1.8) {
      notes.push("At this height the posts take more wind, so set them in the deeper hole and use the higher bag count, especially on an exposed boundary.");
    }
    if (trellisHeight > 0) {
      notes.push("The " + Math.round(trellisHeight * 1000) + " mm trellis topper means taller posts: a " +
        postLength.toFixed(1) + " m post clears the " + height.toFixed(2) + " m fence, the trellis and the buried depth. That's " +
        trellisPanels + " trellis panel" + (trellisPanels === 1 ? "" : "s") + ", one per bay, on top.");
    }

    var slope = slopePlan({ fall: opts.fall, panels: panels, runLength: run, gravelBoardMm: opts.gravelBoardMm });
    if (slope) {
      notes.push("The ground falls " + (slope.fall).toFixed(2) + " m across the run" +
        (slope.gradientPct != null ? " (about " + slope.gradientPct + "%)" : "") +
        ", so step the panels: each bay drops " + slope.stepMm + " mm, leaving a " + slope.gapMm +
        " mm gap under the downhill end of every panel for the gravel board to fill. " +
        (slope.needsDeeperBoard
          ? "That step is more than a standard " + slope.gravelBoardMm + " mm board, so use a deeper board, " + slope.boardsPerBay + " boards stacked, or rake the panels to the slope."
          : "A standard " + slope.gravelBoardMm + " mm gravel board covers it."));
    }

    notes.push("Postmix is a guide: the real amount depends on the hole and post size. Here each hole is about " +
      postHole.sideMm + " mm square and " + postHole.depthMm + " mm deep, so all " + posts + " posts take roughly " +
      postHole.totalM3 + " m³ (" + postHole.totalLitres + " litres) of concrete if you mix your own or order ready-mix instead of bags.");

    return {
      run: run,
      panelWidth: panelWidth,
      panels: panels,
      posts: posts,
      extraPosts: extraPosts,
      lastPanelWidth: lastPanelWidth,
      offcut: offcut,
      builtLength: builtLength,
      fenceHeight: height,
      burial: burial,
      postLength: postLength,
      neededPostLength: neededPostLength,
      holeDepth: holeDepth,
      ground: ground,
      heavyDuty: heavyDuty,
      bagsPerPostLow: per.low,
      bagsPerPostHigh: per.high,
      bagsLow: bagsLow,
      bagsHigh: bagsHigh,
      bagKg: BAG_KG,
      postHole: postHole,
      gravelBoards: gravelBoards,
      caps: caps,
      trellisHeight: trellisHeight,
      trellisPanels: trellisPanels,
      slope: slope,
      notes: notes
    };
  }

  return {
    PANEL_WIDTH: PANEL_WIDTH,
    POST_WIDTH: POST_WIDTH,
    FENCE_HEIGHT: FENCE_HEIGHT,
    BAG_KG: BAG_KG,
    PANEL_PRESETS: PANEL_PRESETS,
    HEIGHT_PRESETS: HEIGHT_PRESETS,
    STANDARD_POST_LENGTHS: STANDARD_POST_LENGTHS,
    round: round,
    standardPostLength: standardPostLength,
    bagsPerPost: bagsPerPost,
    slopePlan: slopePlan,
    GRAVEL_BOARD_MM: GRAVEL_BOARD_MM,
    estimate: estimate
  };
});
