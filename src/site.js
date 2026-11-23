(function () {
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Text size (per reader, remembered)
  var root = document.documentElement;
  var sizes = [1.05, 1.15, 1.25, 1.4, 1.55];
  var idx = parseInt(store.get("fs-idx"), 10);
  if (!isNaN(idx) && sizes[idx]) root.style.setProperty("--fs", sizes[idx] + "rem");
  document.querySelectorAll("[data-fs]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (isNaN(idx)) idx = window.innerWidth < 600 ? 1 : 2;
      idx = Math.max(0, Math.min(sizes.length - 1, idx + parseInt(b.getAttribute("data-fs"), 10)));
      root.style.setProperty("--fs", sizes[idx] + "rem");
      store.set("fs-idx", String(idx));
    });
  });

  // Reading progress
  var bar = document.querySelector(".progress");
  var article = document.querySelector(".prose");
  if (bar && article) {
    var onScroll = function () {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      bar.style.width = (p * 100) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Share
  var toast = document.querySelector(".toast");
  function flash(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("on");
    setTimeout(function () { toast.classList.remove("on"); }, 1800);
  }
  var copyBtn = document.querySelector("[data-copy]");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var url = copyBtn.getAttribute("data-copy");
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { flash("লিংক কপি হয়েছে"); }, function () { prompt("লিংক:", url); });
    else prompt("লিংক:", url);
  });
  var nativeBtn = document.querySelector("[data-native-share]");
  if (nativeBtn) {
    if (navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () {
        navigator.share({ title: nativeBtn.getAttribute("data-title"), text: nativeBtn.getAttribute("data-text"), url: nativeBtn.getAttribute("data-url") }).catch(function () {});
      });
    }
  }
})();
