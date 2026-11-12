/* dueday landing: Pop entrance cascade (progressive enhancement only).
   Without this script every element is visible. With it, items marked [data-pop] that are still
   below the fold are hidden, then pop in ONCE with a springy overshoot when they enter the
   viewport, staggered in DOM order (cap 6 steps). Nothing loops; prefers-reduced-motion = no-op.
   Items already on screen at load are never hidden (no flash, no layout shift: transform/opacity). */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-pop]"));
  if (!items.length) return;
  document.documentElement.classList.add("js-pop");
  var fold = window.innerHeight * 0.9;
  var io = new IntersectionObserver(function (entries) {
    var step = 0;
    entries
      .filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return items.indexOf(a.target) - items.indexOf(b.target); })
      .forEach(function (e) {
        var el = e.target;
        io.unobserve(el);
        el.style.animationDelay = Math.min(step++, 6) * 80 + "ms";
        el.classList.remove("pop-wait");
        el.classList.add("pop-in");
      });
  }, { rootMargin: "0px 0px -10% 0px" });
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add("pop-wait");
    io.observe(el);
  });
})();
