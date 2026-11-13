// Perry, the fence post who stands in the corner. Perry offers a tip when
// tapped and changes expression to match the job: happy when the list is
// ready, thinking when there is something to watch (a cut panel, soft ground),
// a little worried on a tall exposed run. The app tells Perry the mood; Perry
// never changes it on a timer of its own. Everything Perry says goes through
// the bubble's live region so a screen reader hears it, and Perry holds still
// if you have asked for reduced motion.
(function () {
  "use strict";
  var btn = document.getElementById("perry");
  var bubble = document.getElementById("perry-bubble");
  if (!btn) { window.Perry = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var tipKey = "start";
  var bubbleTimer = null, taps = [];

  var TIPS = {
    start: [
      "Hi, I'm Perry. Tell me how long a run of fence you want and I'll give you the panels, posts and postmix to buy.",
      "Panels go between posts, so you always need one more post than panels. I've counted that in.",
      "Measure the real gap you're filling, post to post. It's easy to be a panel out over a long boundary."
    ],
    cut: [
      "Your run doesn't divide into whole panels, so the last one gets cut. A closeboard panel cuts fine; a rigid framed one might not.",
      "If a slim end panel looks odd, start from the other end so the cut panel sits in a corner, or add a short bay."
    ],
    soft: [
      "Soft or sandy ground doesn't grip a post, so it takes more postmix. I've bumped the bags up for you.",
      "In really loose ground, dig a wider hole and let the postmix set fully before you hang the panels."
    ],
    tall: [
      "A six-foot fence catches a lot of wind. Set the posts in the deeper hole and don't skimp on the postmix.",
      "On an exposed boundary, concrete gravel boards and a good post depth are what keep the fence up in a gale."
    ],
    ready: [
      "That's your list. Postmix is a range because it depends on your hole and post size, so buy toward the higher end if you're not sure.",
      "Add a post or two for every corner, gate or end against a wall. There's a box for the extras."
    ]
  };

  function pick(key) {
    var list = TIPS[key] || TIPS.start;
    return list[Math.floor(Math.random() * list.length)];
  }

  var FACES = {
    happy: "M 22 40 Q 32 47 42 40",
    think: "M 22 42 Q 32 39 42 42",
    worry: "M 22 44 Q 32 38 42 44"
  };

  function setMood(m) {
    var mouth = document.getElementById("perry-mouth");
    if (mouth) mouth.setAttribute("d", FACES[m] || FACES.happy);
    btn.classList.toggle("is-worry", m === "worry");
  }

  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove("show"); }, 7000);
  }

  // The app calls this with the latest estimate so Perry's face and tip match
  // what's on screen.
  function context(info) {
    if (!info || !info.posts) { tipKey = "start"; setMood("happy"); return; }
    if (info.offcut > 0) { tipKey = "cut"; setMood("think"); return; }
    if (info.ground === "soft") { tipKey = "soft"; setMood("think"); return; }
    if (info.fenceHeight >= 1.8) { tipKey = "tall"; setMood("worry"); return; }
    tipKey = "ready";
    setMood("happy");
  }

  function react() {
    say(pick(tipKey));
    taps.push(Date.now());
    taps = taps.filter(function (t) { return Date.now() - t < 1500; });
    if (taps.length >= 5 && !still.matches) {
      btn.classList.add("wiggle");
      setTimeout(function () { btn.classList.remove("wiggle"); }, 600);
      taps = [];
    }
  }

  btn.addEventListener("click", react);
  btn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(); }
  });

  setMood("happy");
  window.Perry = { react: react, context: context, say: say };
})();
