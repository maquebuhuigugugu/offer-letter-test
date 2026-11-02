(function () {
  'use strict';

  const main = document.getElementById('main');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const toastElement = document.getElementById('toast');
  const config = window.OfferConfig;
  const data = window.OfferData;
  const core = window.OfferCore;
  let state;
  let toastTimer;
  let posterUrl = null;
  let posterPending = false;
  let storageWarningShown = false;
  let contentUpdated = false;

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function envelopeIcon() {
    return '<svg viewBox="0 0 80 62" fill="none" aria-hidden="true"><rect x="5" y="11" width="70" height="46" rx="4" fill="#faebd4" stroke="currentColor" stroke-width="1.7"/><path d="m7 14 33 25 33-25M7 55l25-22m41 22L48 33" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m57 5 3-5 3 5m9 2 5-3m-3 12h6" stroke="currentColor" stroke-width="1.7"/></svg>';
  }

  function illustration() {
    return '<svg class="mail-illustration" viewBox="0 0 460 264" fill="none" aria-hidden="true">' +
      '<ellipse cx="242" cy="242" rx="155" ry="8" fill="#dfe5d5" opacity=".6"/>' +
      '<path d="M98 136c-39-5-64-26-48-50 15-23 51-10 31 12-13 15-43 34-59 16" stroke="#9aaa8b" stroke-width="1.4" stroke-dasharray="4 5"/>' +
      '<g class="float-paper"><g transform="rotate(-9 227 133)"><rect x="129" y="36" width="191" height="159" rx="4" fill="#edf0e1" stroke="#a5b39a" stroke-width="1.5"/>' +
      '<path d="M150 67h47m-47 14h112m-112 14h134m-134 14h99" stroke="#a4b293" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="270" y="51" width="30" height="36" fill="#e8c2a7" stroke="#cf9c77" stroke-width="1" stroke-dasharray="2 2"/><path d="m278 68 5 5 9-11" stroke="#fff9ea" stroke-width="2"/>' +
      '<path d="M153 144c17-17 32 25 59 0m13 0h43" stroke="#899e78" stroke-width="1.5" stroke-linecap="round"/></g>' +
      '<g transform="rotate(5 237 172)"><path d="m111 133 115-71a14 14 0 0 1 14 0l114 71v91H111z" fill="#e8d5b5" stroke="#bca380" stroke-width="1.5"/>' +
      '<rect x="111" y="131" width="243" height="102" rx="4" fill="#f4e4cb" stroke="#bca380" stroke-width="1.5"/>' +
      '<path d="m113 133 113 68a14 14 0 0 0 15 0l111-68" fill="#f9ecd5" stroke="#bca380" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="m113 232 91-71m148 71-91-71" stroke="#ccb08c" stroke-width="1.5"/>' +
      '<circle cx="236" cy="191" r="15" fill="#d9664d"/><path d="m230 191 4 4 8-9" stroke="#fff4dd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g>' +
      '<path d="m361 64 5-14 5 14 14 5-14 5-5 14-5-14-14-5z" fill="#d78862"/><path d="m105 65 3-8 3 8 8 3-8 3-3 8-3-8-8-3z" fill="#9dae8b"/>' +
      '<path d="M383 176c-1-10 9-19 17-12 8 9-2 20-17 23-5-4-11-13-7-18 3-4 8 1 7 7" stroke="#b4906a" stroke-width="1.5"/>' +
      '<path d="M339 111c18 0 25-8 25-22" stroke="#acb99d" stroke-width="1.4" stroke-dasharray="3 4"/></svg>';
  }

  function hero() {
    return '<section class="hero-copy"><p class="eyebrow">给正在等一封来信的你</p>' +
      '<h1>你的 Offer，<br>会在哪一站<em>敲门？</em></h1>' +
      '<p class="hero-description">测测你什么时候能够拿到 Offer？<br>把等待变成一段小小的剧情，<br>看看好消息会怎样登场。</p>' +
      '<div class="feature-row"><span><b>12</b> 道情境</span><span><b>3</b> 分钟</span><span><b>6</b> 种来信</span></div>' + illustration() +
      '<p class="hero-note">致：嘴上说随缘，手却在刷新邮箱的人。</p></section>';
  }

  function letterTop() {
    return '<div class="airmail-edge" aria-hidden="true"></div><div class="letter-topline"><span>OFFER LETTER SERVICE</span><div class="small-stamp" aria-hidden="true">' + envelopeIcon() + '<span>GOOD LUCK</span></div></div>';
  }

  function letterBottom() {
    return '<div class="letter-bottom"><span class="edition">' + escape(config.edition) + ' / CAMPUS EDITION</span>' + (state.unlocked ? '<button class="sample-link" data-action="example" data-profile="arrival">试读一封样信 ↗</button>' : '') + '</div>';
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add('visible');
    toastTimer = window.setTimeout(function () { toastElement.classList.remove('visible'); }, 4200);
  }

  function persist() {
    try { window.localStorage.setItem(config.storageKey, JSON.stringify(state)); }
    catch (_) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        toast('当前浏览器无法保存进度，这次体验仍可继续。关闭页面前请保存结果。');
      }
    }
  }

  function loadState() {
    let saved;
    try { saved = JSON.parse(window.localStorage.getItem(config.storageKey) || 'null'); }
    catch (_) { saved = null; }
    contentUpdated = Boolean(saved && saved.version !== data.version && saved.answers && Object.keys(saved.answers).length);
    const restored = core.sanitizeState(saved, data);
    if (config.requireAccessCode === false) {
      restored.unlocked = true;
      if (restored.screen === 'gate') restored.screen = 'intro';
    } else if (saved && restored.unlocked && saved.accessRevision === config.accessRevision) {
      restored.accessRevision = config.accessRevision;
    } else {
      restored.unlocked = false;
      restored.screen = 'gate';
    }
    return restored;
  }

  function gateView() {
    return '<div class="landing-grid enter">' + hero() +
      '<section class="letter-card" aria-labelledby="gate-title">' + letterTop() +
      '<div class="address-line"><span>To.</span><strong>今天也在认真找机会的你</strong></div><div class="faint-mark" aria-hidden="true">COMING<br>SOON</div>' +
      '<h2 id="gate-title">有一封关于你的<br>好消息，待签收。</h2>' +
      '<p class="card-description">输入你收到的四位兑换码，<br>拆开一份专属于你的求职剧情预告。</p>' +
      '<form id="gate-form" class="gate-form" novalidate><label class="field-label" for="access-code">四位兑换码</label>' +
      '<input id="access-code" class="code-field" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="····" aria-describedby="code-error" required>' +
      '<p id="code-error" class="field-error" role="alert"></p><button type="submit" class="primary-button">签收我的来信 <span class="arrow" aria-hidden="true">→</span></button></form>' +
      '<p class="gate-note">完整趣味体验 ¥' + escape(config.price) + ' · 兑换码随商品使用说明发放<br>本页仅验证兑换码，不提供收款。</p>' +
      '<p class="gate-note">娱乐化剧情推演，不预测真实录用时间。</p>' + letterBottom() + '</section></div>';
  }

  function introView() {
    const progress = core.progress(data, state.answers);
    const hasAnswers = progress.answered > 0;
    const full = progress.answered === progress.total && state.completedAt;
    return '<div class="landing-grid enter">' + hero() + '<section class="letter-card" aria-labelledby="intro-title">' + letterTop() +
      '<h2 id="intro-title" tabindex="-1">你的好消息，<br>会怎样登场？</h2><p class="card-description">无论还没投递、正在面试，还是等待回复，<br>都可以把自己放进这些小情境里。</p><p class="intro-context">没有实习经历也能选，课程作业、社团、比赛、兼职都可以代入。没遇到过的情况，就想象自己会怎么做。</p>' +
      '<div class="intro-feature"><div><strong>12 次个人选择</strong><span>没有“优秀的人才配选”的答案</span></div><div><strong>一封完整来信</strong><span>时间窗口、剧情与主角设定</span></div><div><strong>同样答案，同样故事</strong><span>六种剧情，平行展开</span></div><div><strong>留下这一刻</strong><span>生成一张可以保存的海报</span></div></div>' +
      '<div class="notice-box">这是娱乐化剧情推演，时间窗口是故事设定，不是实际录用预测，也不代表任何公司的招聘评价。答案仅保存在本机，不上传姓名或简历。</div>' +
      (contentUpdated ? '<p class="resume-notice">题目和来信更新了，请重新做一次，看看这次的故事。</p>' : '') +
      (hasAnswers ? '<p class="resume-notice">' + (full ? '上次的来信还在这里，可以直接重新打开。' : '信写到一半也没关系。已保存 ' + progress.answered + ' / 12 道选择。') + '</p>' : '') +
      '<button class="primary-button" id="start-button" data-action="start">' + (full ? '打开上次的来信' : hasAnswers ? '继续我的来信' : '开始我的 12 次选择') + ' <span class="arrow" aria-hidden="true">→</span></button>' +
      (hasAnswers ? '<button class="intro-reset" data-action="retest">想换个心情？从头再测一次</button>' : '<p class="gate-note">约 3 分钟 · 可以返回修改 · 全部内容一次呈现</p>') + letterBottom() + '</section></div>';
  }

  function quizView() {
    const question = data.questions[state.cursor];
    const selected = state.answers[question.id];
    const number = state.cursor + 1;
    const last = number === data.questions.length;
    return '<div class="quiz-wrap enter"><div class="quiz-head"><p class="eyebrow">正在写你的来信</p><p class="quiz-number"><strong>' + String(number).padStart(2, '0') + '</strong> / 12</p></div>' +
      '<div class="progress-track" role="progressbar" aria-label="题目进度" aria-valuemin="0" aria-valuemax="12" aria-valuenow="' + number + '"><div class="progress-fill" style="width:' + (number / 12 * 100) + '%"></div></div>' +
      '<section class="question-card" aria-labelledby="question-title"><p class="chapter-label">SCENE ' + String(number).padStart(2, '0') + ' <span class="tiny-diamond" aria-hidden="true"></span> ' + escape(question.chapter) + '</p>' +
      '<h1 id="question-title" tabindex="-1">' + escape(question.title) + '</h1><p class="question-context">' + escape(question.context) + '</p>' +
      '<div class="options" role="radiogroup" aria-labelledby="question-title">' + question.options.map(function (option, index) {
        const checked = option.id === selected;
        return '<button type="button" class="option" id="option-' + option.id + '" role="radio" aria-checked="' + checked + '" tabindex="' + ((selected ? checked : index === 0) ? '0' : '-1') + '" data-action="select" data-option="' + option.id + '"><span class="option-letter" aria-hidden="true">' + String.fromCharCode(65 + index) + '</span><span>' + escape(option.text) + '</span></button>';
      }).join('') + '</div><p class="question-footnote">选更像你的反应就好，选项没有优劣。</p></section>' +
      '<div class="quiz-controls"><button class="secondary-button" data-action="previous">' + (state.cursor === 0 ? '读信说明' : '← 上一题') + '</button><span class="save-note">' + (storageWarningShown ? '本次进度暂存在页面中' : '选择后自动保存在本机') + '</span>' +
      '<button class="primary-button" data-action="next"' + (!selected ? ' disabled' : '') + '>' + (last ? '拆开我的来信' : '下一题') + ' <span class="arrow" aria-hidden="true">→</span></button></div>' +
      '<p class="question-error" id="question-error" role="alert"></p><p class="keyboard-hint">也可以用键盘 1—4 选择 · 方向键切换选项</p></div>';
  }

  function resultReport() {
    return Object.assign(core.calculateResult(data, state.answers), { completedAt: state.completedAt });
  }

  function resultView() {
    const report = resultReport();
    const profile = report.profile;
    return '<article class="result-wrap enter"><div class="result-nav"><span>第 ' + String(report.profileIndex + 1).padStart(2, '0') + ' 封剧情来信 / 共 6 种</span><button data-action="edit-answers">回看我的选择 ↗</button></div>' +
      '<section class="result-hero" aria-labelledby="result-title"><div class="airmail-edge" aria-hidden="true"></div><p class="eyebrow">你的 OFFER 剧情预告已送达</p><div class="result-envelope" aria-hidden="true">' + envelopeIcon() + '</div>' +
      '<div class="window-block"><div><span class="window-label">你的 Offer 剧情窗口</span><p class="window-time">' + escape(profile.windowLabel) + '</p></div></div>' +
      '<p class="window-note">' + escape(profile.windowNote) + '</p><h1 class="result-name" id="result-title" tabindex="-1">' + escape(profile.name) + '</h1>' +
      '<div class="tags">' + profile.tags.map(function (tag) { return '<span class="tag">' + escape(tag) + '</span>'; }).join('') + '</div>' +
      '<p class="result-quote">' + escape(profile.quote) + '</p></section>' +
      '<section class="result-section"><div class="section-heading"><span>01</span><h2>为什么是你</h2></div><div class="evidence-grid">' + report.evidence.map(function (entry) {
        return '<section class="evidence-card"><div class="evidence-caption">你在第 ' + String(data.questions.findIndex(function (question) { return question.id === entry.questionId; }) + 1).padStart(2, '0') + ' 题选了</div><blockquote>' + escape(entry.optionText) + '</blockquote><p>' + escape(entry.insight) + '</p></section>';
      }).join('') + '</div></section>' +
      '<section class="result-section"><div class="section-heading"><span>02</span><h2>你的 Offer 登场剧情</h2></div><div class="story-letter">' + profile.story.map(function (paragraph) { return '<p>' + escape(paragraph) + '</p>'; }).join('') + '</div></section>' +
      '<section class="result-section"><div class="section-heading"><span>03</span><h2>给你的最后一句</h2></div><blockquote class="closing-note">' + escape(profile.closing) + '</blockquote><p class="signature">With a little luck,<br>Offer 来信局</p></section>' +
      '<div class="result-actions"><button id="poster-button" class="primary-button" data-action="poster">保存我的来信海报 <span class="arrow" aria-hidden="true">↗</span></button><button class="secondary-button" data-action="retest">重新测试</button></div>' +
      '<p class="privacy-note">来信已保存在本机，下次打开可以继续查看。清除浏览器数据会移除记录。</p>' +
      '<p class="result-footer-note">时间窗口仅为娱乐剧情设定，不是现实录用预测。<br>六种来信都是平行的故事，不代表能力、机会或求职优劣。<br>AI 辅助创作 · 真实结果以招聘通知为准</p></article>';
  }

  function render(options) {
    const opts = options || {};
    try {
      main.innerHTML = state.screen === 'gate' ? gateView() : state.screen === 'intro' ? introView() : state.screen === 'quiz' ? quizView() : resultView();
      document.body.dataset.screen = state.screen;
      if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'instant' });
      if (opts.focus) {
        const target = document.querySelector(opts.focus);
        if (target) target.focus({ preventScroll: true });
      }
    } catch (error) {
      console.error('Offer letter rendering failed:', error);
      main.innerHTML = '<section class="error-card"><h1>这封信暂时没能展开。</h1><p>请刷新后再试。如果仍未恢复，可以联系卖家检查网页文件是否完整。你已保存的答案不会被自动删除。</p></section>';
    }
  }

  function go(screen, focus) {
    state.screen = screen;
    persist();
    render({ focus: focus || '#main' });
  }

  function cleanupPoster() {
    if (posterUrl) URL.revokeObjectURL(posterUrl);
    posterUrl = null;
  }

  function openModal(title, body, className) {
    cleanupPoster();
    modalContent.innerHTML = '<div class="modal-inner ' + (className || '') + '"><div class="modal-header"><h2 id="modal-title">' + escape(title) + '</h2><button class="close-button" data-action="close-modal" aria-label="关闭弹窗">×</button></div>' + body + '</div>';
    if (!modal.open) modal.showModal();
  }

  function showExample(id) {
    const profile = data.profiles.find(function (item) { return item.id === id; }) || data.profiles[0];
    openModal('试读：' + profile.name, '<div class="modal-body"><p class="example-label">这是示例来信，不是你的测试结果</p><p class="example-window">' + escape(profile.windowLabel) + '</p><p>' + escape(profile.windowNote) + '</p><div class="example-quote">“' + escape(profile.quote) + '”</div>' + profile.story.map(function (paragraph) { return '<p>' + escape(paragraph) + '</p>'; }).join('') + '<p class="example-closing">' + escape(profile.closing) + '</p></div><div class="sample-switch">' + data.profiles.map(function (item) {
      return '<button data-action="example" data-profile="' + item.id + '" aria-pressed="' + (item.id === profile.id) + '">' + escape(item.name) + '</button>';
    }).join('') + '</div>');
  }

  function about() {
    openModal('关于这封信', '<div class="modal-body"><p><strong>这是一份求职剧情预告。</strong><br>12 道情境选择，匹配 6 种原创故事。时间窗口是娱乐创作，无法推算真实招聘进度。</p><p><strong>无论处在哪一站，都能开始。</strong><br>还没投递、正在面试、等待回复，都可以想象自己遇到题目里的情境，选更像自己的反应。</p><p><strong>你的选择留在你这里。</strong><br>答案和结果仅保存在当前设备。我们不收集姓名、简历或邮箱，也不把答题内容上传。</p><p><strong>同样的选择，会收到同样的信。</strong><br>六种故事按固定规则匹配，题目与结果由 AI 辅助创作。故事之间没有能力高低或录用概率排名。</p><p>' + (config.requireAccessCode === false ? '当前为开放体验版，无需登录或兑换码，点击开始即可体验。' : '输入商品说明里的四位兑换码后，即可开始测试。') + '本页不提供付款。</p></div>');
  }

  function confirmRetest() {
    openModal('想换个心情再出发？', '<div class="modal-body"><p>重新测试会清除本机这一次的答案和来信。喜欢现在的故事，可以先保存海报。</p></div><div class="modal-action-row"><button class="secondary-button" data-action="close-modal">保留这封信</button><button class="primary-button" data-action="confirm-retest">从头再测一次</button></div>');
  }

  async function showPoster() {
    if (posterPending || state.screen !== 'result') return;
    posterPending = true;
    const button = document.getElementById('poster-button');
    const generationSignature = JSON.stringify([data.questions.map(function (question) { return state.answers[question.id]; }), state.completedAt]);
    if (button) { button.disabled = true; button.textContent = '正在把来信装进海报…'; }
    try {
      const image = await window.OfferPoster.create(resultReport(), { title: config.title, brand: config.brand });
      const currentSignature = JSON.stringify([data.questions.map(function (question) { return state.answers[question.id]; }), state.completedAt]);
      if (state.screen !== 'result' || currentSignature !== generationSignature) { URL.revokeObjectURL(image.url); return; }
      openModal('把这封来信带走', '<img id="poster-preview" class="poster-image" alt="我的 Offer 剧情来信海报，包含剧情窗口、主角设定和金句" width="1200" height="1600"><p class="poster-help">手机上可长按图片保存，也可以点击下方下载。<br>若内置浏览器无法下载，可先长按图片，或在系统浏览器打开本页。</p><a id="poster-download" class="primary-button download-link">下载 PNG 海报 <span aria-hidden="true">↓</span></a>', 'poster-modal');
      posterUrl = image.url;
      document.getElementById('poster-preview').src = image.url;
      const link = document.getElementById('poster-download');
      link.href = image.url;
      link.download = config.posterFilename;
      link.addEventListener('click', function () { toast('已请求下载。手机上也可以长按海报保存。'); });
    } catch (error) {
      console.error('Offer poster failed:', error);
      toast('这次没能生成图片，请稍后重试。也可以先截图保存来信。');
    } finally {
      posterPending = false;
      const currentButton = document.getElementById('poster-button');
      if (currentButton) { currentButton.disabled = false; currentButton.innerHTML = '保存我的来信海报 <span class="arrow" aria-hidden="true">↗</span>'; }
    }
  }

  function selectOption(id) {
    const question = data.questions[state.cursor];
    if (!question.options.some(function (option) { return option.id === id; })) return;
    if (state.answers[question.id] !== id) state.completedAt = null;
    state.answers[question.id] = id;
    persist();
    render({ scroll: false, focus: '#option-' + id });
  }

  function handleAction(action, target) {
    switch (action) {
      case 'home':
        if (modal.open) modal.close();
        go(state.unlocked ? 'intro' : 'gate');
        break;
      case 'about': about(); break;
      case 'example': showExample(target.dataset.profile); break;
      case 'close-modal': modal.close(); break;
      case 'start': {
        contentUpdated = false;
        state.consent = true;
        const progress = core.progress(data, state.answers);
        if (progress.answered === 12 && state.completedAt) go('result', '#result-title');
        else {
          const unanswered = data.questions.findIndex(function (question) { return !state.answers[question.id]; });
          state.cursor = Math.max(0, unanswered);
          go('quiz', '#question-title');
        }
        break;
      }
      case 'select': selectOption(target.dataset.option); break;
      case 'previous':
        if (state.cursor === 0) go('intro');
        else { state.cursor -= 1; go('quiz', '#question-title'); }
        break;
      case 'next': {
        const question = data.questions[state.cursor];
        if (!state.answers[question.id]) return;
        if (state.cursor < 11) { state.cursor += 1; go('quiz', '#question-title'); }
        else {
          const missing = data.questions.findIndex(function (item) { return !state.answers[item.id]; });
          if (missing !== -1) { state.cursor = missing; go('quiz', '#question-title'); toast('还有一道选择没写完，先补上它吧。'); }
          else { state.completedAt = state.completedAt || new Date().toISOString(); go('result', '#result-title'); }
        }
        break;
      }
      case 'edit-answers': state.cursor = 0; go('quiz', '#question-title'); break;
      case 'retest': confirmRetest(); break;
      case 'confirm-retest': {
        const unlocked = state.unlocked;
        const consent = state.consent;
        state = core.createState(data.version);
        state.unlocked = unlocked;
        state.consent = consent;
        if (unlocked && config.requireAccessCode) state.accessRevision = config.accessRevision;
        modal.close();
        go(consent ? 'quiz' : 'intro', consent ? '#question-title' : '#main');
        break;
      }
      case 'poster': showPoster(); break;
      default: break;
    }
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    if (['start', 'select', 'previous', 'next', 'edit-answers', 'retest', 'confirm-retest', 'poster', 'example'].includes(target.dataset.action) && !state.unlocked) return;
    handleAction(target.dataset.action, target);
  });

  document.addEventListener('submit', function (event) {
    if (event.target.id !== 'gate-form') return;
    event.preventDefault();
    const input = document.getElementById('access-code');
    const normalized = input.value.trim().replace(/[０-９]/g, function (character) { return String.fromCharCode(character.charCodeAt(0) - 0xfee0); });
    if (normalized !== config.accessCode) {
      document.getElementById('code-error').textContent = /^\d{4}$/.test(normalized) ? '兑换码还没对上，请核对使用说明中的四位数字。' : '请输入四位数字兑换码。';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      input.select();
      return;
    }
    state.unlocked = true;
    state.accessRevision = config.accessRevision;
    go('intro', '#intro-title');
  });

  document.addEventListener('input', function (event) {
    if (event.target.id === 'access-code') {
      event.target.setAttribute('aria-invalid', 'false');
      document.getElementById('code-error').textContent = '';
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!state || state.screen !== 'quiz' || modal.open || event.metaKey || event.ctrlKey || event.altKey) return;
    const question = data.questions[state.cursor];
    if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      selectOption(question.options[Number(event.key) - 1].id);
    } else if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key) && event.target.closest('.option')) {
      event.preventDefault();
      const current = question.options.findIndex(function (option) { return option.id === state.answers[question.id]; });
      const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
      selectOption(question.options[(Math.max(0, current) + direction + 4) % 4].id);
    }
  });

  modal.addEventListener('close', cleanupPoster);
  modal.addEventListener('click', function (event) {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close();
  });

  try {
    if (!config || !data || !core || !window.OfferPoster) throw new Error('Missing application assets');
    core.validateData(data);
    state = loadState();
    render();
  } catch (error) {
    console.error('Offer letter initialization failed:', error);
    main.innerHTML = '<section class="error-card"><h1>来信文件还没到齐。</h1><p>请检查 index.html、config.js、data.js、core.js、poster.js、app.js 和 style.css 是否在同一个目录，再刷新页面。</p></section>';
  }
})();
