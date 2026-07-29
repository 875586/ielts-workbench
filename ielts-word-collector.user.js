// ==UserScript==
// @name         雅思备考工作台 - 新东方一键收词
// @namespace    https://875586.github.io/ielts-workbench/
// @version      1.0.0
// @description  在新东方雅思做题页显示橙色“+”，选中生词后一键带入雅思备考工作台。
// @author       IELTS Workbench
// @match        https://ieltscat.xdf.cn/*
// @match        https://www.ieltscat.com/*
// @icon         https://875586.github.io/ielts-workbench/favicon.ico
// @grant        none
// @run-at       document-end
// @noframes
// @downloadURL  https://raw.githubusercontent.com/875586/ielts-workbench/main/ielts-word-collector.user.js
// @updateURL    https://raw.githubusercontent.com/875586/ielts-workbench/main/ielts-word-collector.user.js
// ==/UserScript==

(() => {
  "use strict";

  const WORKBENCH_URL = "https://875586.github.io/ielts-workbench/";
  const HOST_ID = "ielts-workbench-word-collector";
  let lastSelection = "";
  let toastTimer = 0;

  if (document.getElementById(HOST_ID)) return;

  function cleanSelection(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function rememberSelection() {
    const selected = cleanSelection(window.getSelection?.().toString());
    if (selected) lastSelection = selected;
  }

  function pageText() {
    return String(document.body?.innerText || "").slice(0, 8000);
  }

  function detectCategory(text) {
    if (/reading\s+passage|read\s+the\s+text|passage\s*[1-3]|阅读/i.test(text)) {
      return "reading";
    }
    if (/listening|section\s*[1-4]|part\s*[1-4]|听力/i.test(text)) {
      return "listening";
    }
    return "";
  }

  function detectSource(text) {
    const compact = text.replace(/\s+/g, " ");
    const fullMatch = compact.match(
      /(?:剑雅?|Cambridge)\s*(\d{1,2}).{0,50}?Test\s*([1-4]).{0,50}?(?:Passage|Section|Part)\s*([1-4])/i
    );
    if (fullMatch) {
      return `剑${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}`;
    }

    const bookTestMatch = compact.match(/(?:剑雅?|Cambridge)\s*(\d{1,2}).{0,40}?Test\s*([1-4])/i);
    const partMatch = compact.match(/(?:Passage|Section|Part)\s*([1-4])/i);
    if (bookTestMatch && partMatch) {
      return `剑${bookTestMatch[1]}-${bookTestMatch[2]}-${partMatch[1]}`;
    }
    if (bookTestMatch) {
      return `剑${bookTestMatch[1]}-${bookTestMatch[2]}`;
    }
    return "";
  }

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.dataset.error = String(isError);
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  async function getSelectedWord() {
    const current = cleanSelection(window.getSelection?.().toString());
    if (current) return current;
    if (lastSelection) return lastSelection;

    try {
      return cleanSelection(await navigator.clipboard?.readText?.());
    } catch {
      return "";
    }
  }

  async function collectWord() {
    const word = await getSelectedWord();
    if (!word) {
      showToast("请先选中一个英文单词，再点击“+”", true);
      return;
    }

    const text = pageText();
    const params = new URLSearchParams({
      collector: "1",
      auto: "1",
      word
    });
    const category = detectCategory(text);
    const source = detectSource(text);
    if (category) params.set("category", category);
    if (source) params.set("source", source);

    const popup = window.open(
      `${WORKBENCH_URL}?${params.toString()}`,
      "ieltsWordCollector",
      "popup=yes,width=460,height=760,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      showToast("Safari 阻止了弹窗，请允许此网站显示弹窗", true);
      return;
    }

    showToast(source ? `已带入：${word} · ${source}` : `已带入：${word}`);
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        position: fixed;
        right: 26px;
        bottom: 86px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      }

      button {
        display: grid;
        width: 64px;
        height: 64px;
        padding: 0;
        place-items: center;
        border: 0;
        border-radius: 50%;
        color: #fff;
        background: linear-gradient(145deg, #ff7a45, #ee4f21);
        box-shadow:
          0 14px 34px rgba(238, 79, 33, 0.42),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
        cursor: pointer;
        font: 300 42px/1 -apple-system, BlinkMacSystemFont, sans-serif;
        transition: transform 160ms ease, box-shadow 160ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      button:hover {
        transform: translateY(-3px) scale(1.04);
        box-shadow:
          0 18px 38px rgba(238, 79, 33, 0.48),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }

      button:active {
        transform: scale(0.96);
      }

      button:focus-visible {
        outline: 4px solid rgba(255, 122, 69, 0.3);
        outline-offset: 4px;
      }

      .plus {
        display: block;
        margin-top: -4px;
      }

      .hint {
        position: absolute;
        right: 74px;
        bottom: 11px;
        width: max-content;
        max-width: 240px;
        padding: 9px 12px;
        border-radius: 10px;
        color: #fff;
        background: rgba(16, 42, 86, 0.94);
        box-shadow: 0 8px 24px rgba(16, 42, 86, 0.22);
        font-size: 12px;
        font-weight: 650;
        line-height: 1.4;
        opacity: 0;
        pointer-events: none;
        transform: translateX(6px);
        transition: opacity 160ms ease, transform 160ms ease;
      }

      button:hover + .hint,
      button:focus-visible + .hint {
        opacity: 1;
        transform: translateX(0);
      }

      .toast {
        position: absolute;
        right: 0;
        bottom: 76px;
        width: max-content;
        max-width: min(320px, calc(100vw - 36px));
        padding: 10px 14px;
        border-radius: 11px;
        color: #fff;
        background: rgba(25, 169, 116, 0.96);
        box-shadow: 0 10px 28px rgba(16, 42, 86, 0.22);
        font-size: 12px;
        font-weight: 650;
        line-height: 1.45;
        opacity: 0;
        pointer-events: none;
        transform: translateY(6px);
        transition: opacity 160ms ease, transform 160ms ease;
      }

      .toast[data-error="true"] {
        background: rgba(207, 54, 54, 0.96);
      }

      .toast.show {
        opacity: 1;
        transform: translateY(0);
      }

      @media (max-width: 700px) {
        :host {
          right: 16px;
          bottom: 78px;
        }

        button {
          width: 58px;
          height: 58px;
          font-size: 38px;
        }

        .hint {
          display: none;
        }
      }
    </style>
    <button type="button" aria-label="把选中的单词收录到雅思备考工作台" title="选中单词后点击收录">
      <span class="plus" aria-hidden="true">+</span>
    </button>
    <span class="hint">选中生词，点击“+”自动收录</span>
    <div class="toast" role="status" aria-live="polite"></div>
  `;

  const button = shadow.querySelector("button");
  const toast = shadow.querySelector(".toast");
  button.addEventListener("pointerdown", (event) => event.preventDefault());
  button.addEventListener("click", collectWord);
  document.addEventListener("selectionchange", rememberSelection, true);
  document.documentElement.appendChild(host);
})();
