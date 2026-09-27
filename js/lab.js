/* lab-only behaviour */
(function () {
  document.querySelectorAll('[data-carousel]').forEach(function (c) {
    var track = c.querySelector('.carousel__track');
    c.querySelectorAll('.carousel__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var card = track.querySelector('.quote');
        track.scrollBy({ left: (card ? card.offsetWidth + 24 : 400) * Number(b.dataset.dir), behavior: 'smooth' });
      });
    });
  });
  // board: size each iframe to its card; +N variants opens a section's group
  var frames = [].slice.call(document.querySelectorAll('.card .frame'));
  function sizeFrames() { frames.forEach(function (f) { if (f.clientWidth) f.querySelector('iframe').style.setProperty('--s', f.clientWidth / 1280); }); }
  sizeFrames(); window.addEventListener('resize', sizeFrames);
  document.querySelectorAll('.group .more').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.closest('.group'), open = g.classList.toggle('is-open');
      b.setAttribute('aria-expanded', open); b.dataset.n = b.dataset.n || b.textContent;
      b.textContent = open ? 'Hide variants' : b.dataset.n; sizeFrames();
    });
  });
})();
