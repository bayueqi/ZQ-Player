// 页脚年份
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// 导航滚动状态
const nav = document.getElementById("nav");
if (nav) {
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// 入场动画
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const groups = new Map();
  revealItems.forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    const index = groups.get(parent) ?? 0;
    groups.set(parent, index + 1);
    el.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );

  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add("is-in"));
}

// 复制命令
document.querySelectorAll("[data-copy]").forEach((btn) => {
  const label = btn.querySelector(".copy-label");
  btn.addEventListener("click", async () => {
    const code = btn.closest(".code-card")?.querySelector("code");
    if (!code || !label) return;
    try {
      await navigator.clipboard.writeText(code.textContent.trim());
      btn.classList.add("is-done");
      label.textContent = "已复制";
      setTimeout(() => {
        btn.classList.remove("is-done");
        label.textContent = "复制";
      }, 1600);
    } catch {
      label.textContent = "复制失败";
    }
  });
});
