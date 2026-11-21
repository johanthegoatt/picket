// Picket page glue: read the fence inputs, run the engine in core.js, draw the
// shopping list and keep a share link in sync. All the fence maths lives in
// core.js so it can be tested without a browser.
(function () {
  "use strict";
  var P = window.Picket;
  var $ = function (id) { return document.getElementById(id); };

  var runEl = $("run"), panelEl = $("panel"), heightEl = $("height");
  var groundEl = $("ground"), postEl = $("post"), extraEl = $("extra"), trellisEl = $("trellis");
  var heavyEl = $("heavy"), gravelEl = $("gravel"), capsEl = $("caps");
  var out = $("out");

  function fillSelect(el, presets, valueKey) {
    presets.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p[valueKey];
      o.textContent = p.label;
      el.appendChild(o);
    });
  }

  fillSelect(panelEl, P.PANEL_PRESETS, "width");
  fillSelect(heightEl, P.HEIGHT_PRESETS, "height");

  function readOpts() {
    return {
      runLength: parseFloat(runEl.value) || 0,
      panelWidth: parseFloat(panelEl.value) || P.PANEL_WIDTH,
      fenceHeight: parseFloat(heightEl.value) || P.FENCE_HEIGHT,
      postWidth: parseFloat(postEl.value) || P.POST_WIDTH,
      ground: groundEl.value,
      heavyDuty: heavyEl.checked,
      gravelBoards: gravelEl.checked,
      postCaps: capsEl.checked,
      extraPosts: parseInt(extraEl.value, 10) || 0,
      trellisHeight: parseFloat(trellisEl.value) || 0
    };
  }

  function bagLine(r) {
    if (r.bagsLow === r.bagsHigh) return r.bagsLow + " bags";
    return r.bagsLow + "–" + r.bagsHigh + " bags";
  }

  function row(qty, label, sub) {
    return '<li class="buy"><span class="qty">' + qty + '</span>' +
      '<span class="what"><strong>' + label + '</strong>' +
      (sub ? '<span class="sub">' + sub + '</span>' : '') + '</span></li>';
  }

  function render() {
    var opts = readOpts();
    var r = P.estimate(opts);

    if (!r.posts) {
      out.innerHTML = '<p class="empty">Put in the length of fence above and your shopping list appears here.</p>';
      if (window.Perry) Perry.context(null);
      return;
    }

    var items = "";
    items += row(r.panels, r.panels === 1 ? "panel" : "panels",
      "each " + opts.panelWidth.toFixed(2) + " m wide" + (r.offcut > 0 ? ", last one cut to " + r.lastPanelWidth.toFixed(2) + " m" : ""));
    items += row(r.posts, r.posts === 1 ? "post" : "posts",
      r.postLength.toFixed(1) + " m long, set about " + Math.round(r.holeDepth * 1000) + " mm into the ground");
    items += row(bagLine(r), "postmix", r.bagsPerPostLow + "–" + r.bagsPerPostHigh + " x " + r.bagKg + " kg per post, " + r.ground + " ground");
    if (r.postHole && r.posts > 0) items += row(r.postHole.totalM3 + " m³", "or mixed concrete", r.postHole.sideMm + " mm square x " + r.postHole.depthMm + " mm holes, cheaper to mix or order ready-mix on a long run");
    if (r.trellisPanels) items += row(r.trellisPanels, r.trellisPanels === 1 ? "trellis topper" : "trellis toppers", Math.round(r.trellisHeight * 1000) + " mm, one per bay, sat on top of the panels");
    if (r.gravelBoards) items += row(r.gravelBoards, r.gravelBoards === 1 ? "gravel board" : "gravel boards", "one per bay, keeps the panels off wet ground");
    if (r.caps) items += row(r.caps, r.caps === 1 ? "post cap" : "post caps", "sheds rain off the post tops");

    var notes = r.notes.map(function (n) { return "<li>" + n + "</li>"; }).join("");

    out.innerHTML =
      '<div class="summary">' +
        '<p class="built">A <strong>' + r.run.toFixed(2) + ' m</strong> fence at <strong>' + r.fenceHeight.toFixed(2) + ' m</strong> high works out about <strong>' + r.builtLength.toFixed(2) + ' m</strong> end to end with the posts.</p>' +
      '</div>' +
      '<h2 class="buy-head">Your shopping list</h2>' +
      '<ul class="buylist">' + items + '</ul>' +
      '<ul class="tips">' + notes + '</ul>';

    if (window.Perry) Perry.context(r);
  }

  // Keep the inputs in the URL so a link rebuilds the same fence.
  function toQuery() {
    var o = readOpts();
    var q = new URLSearchParams();
    q.set("run", o.runLength);
    q.set("pw", o.panelWidth);
    q.set("h", o.fenceHeight);
    q.set("post", o.postWidth);
    q.set("g", o.ground);
    if (o.heavyDuty) q.set("hd", "1");
    if (!o.gravelBoards) q.set("gb", "0");
    if (!o.postCaps) q.set("cap", "0");
    if (o.extraPosts) q.set("x", o.extraPosts);
    if (o.trellisHeight) q.set("tr", o.trellisHeight);
    return q.toString();
  }

  function fromQuery() {
    if (!location.search) return;
    var q = new URLSearchParams(location.search);
    if (q.has("run")) runEl.value = q.get("run");
    if (q.has("pw")) panelEl.value = q.get("pw");
    if (q.has("h")) heightEl.value = q.get("h");
    if (q.has("post")) postEl.value = q.get("post");
    if (q.has("g")) groundEl.value = q.get("g");
    heavyEl.checked = q.get("hd") === "1";
    if (q.get("gb") === "0") gravelEl.checked = false;
    if (q.get("cap") === "0") capsEl.checked = false;
    if (q.has("x")) extraEl.value = q.get("x");
    if (q.has("tr")) trellisEl.value = q.get("tr");
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "?" + toQuery();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        if (window.Perry) Perry.say("Link copied. Paste it to anyone and they'll see the same list.");
      });
    } else if (window.Perry) {
      Perry.say(url);
    }
  });

  $("clear").addEventListener("click", function () {
    runEl.value = ""; extraEl.value = "0";
    heavyEl.checked = false; gravelEl.checked = true; capsEl.checked = true;
    panelEl.selectedIndex = 0; heightEl.selectedIndex = 0;
    groundEl.value = "firm"; postEl.value = "100"; trellisEl.value = "0";
    history.replaceState(null, "", location.pathname);
    render();
  });

  [runEl, panelEl, heightEl, groundEl, postEl, extraEl, trellisEl, heavyEl, gravelEl, capsEl].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  fromQuery();
  render();
})();
