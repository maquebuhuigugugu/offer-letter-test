/* Offer 来信：确定性剧情匹配与本机状态校验。分数仅用于内部匹配。 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OfferCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PROFILE_IDS = ['arrival', 'pivot', 'craft', 'connection', 'steady', 'spark'];
  var SCREENS = ['gate', 'intro', 'quiz', 'result'];
  var OWN = Object.prototype.hasOwnProperty;

  function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function nonempty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function safeId(value) {
    return typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value);
  }

  function validateData(data) {
    assert(record(data), '测试数据必须是对象。');
    assert(nonempty(data.version), '测试数据缺少版本。');
    assert(Array.isArray(data.profiles) && data.profiles.length === 6, '需要六种剧情。');
    var profileIds = new Set();
    data.profiles.forEach(function (profile) {
      assert(record(profile) && PROFILE_IDS.indexOf(profile.id) !== -1 && !profileIds.has(profile.id), '剧情编号无效或重复。');
      profileIds.add(profile.id);
      ['name', 'windowLabel', 'windowNote', 'quote', 'closing', 'accent'].forEach(function (key) {
        assert(nonempty(profile[key]), '剧情 ' + profile.id + ' 缺少 ' + key + '。');
      });
      assert(Array.isArray(profile.tags) && profile.tags.length >= 1 && profile.tags.every(nonempty), '剧情标签无效。');
      assert(Array.isArray(profile.story) && profile.story.length === 3 && profile.story.every(nonempty), '剧情需要三个完整段落。');
    });
    assert(Array.isArray(data.questions) && data.questions.length === 12, '需要十二道情境题。');
    var questionIds = new Set();
    data.questions.forEach(function (question) {
      assert(record(question) && safeId(question.id) && !questionIds.has(question.id), '题目编号无效或重复。');
      questionIds.add(question.id);
      assert(nonempty(question.chapter) && nonempty(question.title) && nonempty(question.context), '题目内容不完整。');
      assert(Array.isArray(question.options) && question.options.length === 4, '每题需要四个选项。');
      var optionIds = new Set();
      question.options.forEach(function (option) {
        assert(record(option) && ['a', 'b', 'c', 'd'].indexOf(option.id) !== -1 && !optionIds.has(option.id), '选项编号无效或重复。');
        optionIds.add(option.id);
        assert(nonempty(option.text) && nonempty(option.insight), '选项文案不完整。');
        assert(Array.isArray(option.scores) && option.scores.length === 6, '选项需要六个剧情权重。');
        assert(option.scores.every(function (score) {
          return Number.isSafeInteger(score) && score >= 0 && score <= Math.floor(Number.MAX_SAFE_INTEGER / 12);
        }), '剧情权重必须是非负安全整数。');
      });
    });
    return true;
  }

  function validOption(question, answers) {
    if (!record(answers) || !OWN.call(answers, question.id)) return null;
    return question.options.find(function (option) { return option.id === answers[question.id]; }) || null;
  }

  function progress(data, answers) {
    validateData(data);
    var answered = data.questions.reduce(function (count, question) {
      return count + (validOption(question, answers) ? 1 : 0);
    }, 0);
    return { answered: answered, total: data.questions.length, percent: Math.round(answered / data.questions.length * 100) };
  }

  function calculateResult(data, answers) {
    validateData(data);
    assert(record(answers), '请先完成全部题目。');
    var knownIds = new Set(data.questions.map(function (question) { return question.id; }));
    assert(Object.keys(answers).every(function (key) { return knownIds.has(key); }), '作答包含未知题目。');
    var totals = [0, 0, 0, 0, 0, 0];
    var selected = data.questions.map(function (question, index) {
      var option = validOption(question, answers);
      assert(option, '题目 ' + question.id + ' 尚未作答或选项无效。');
      option.scores.forEach(function (score, profileIndex) { totals[profileIndex] += score; });
      return { question: question, option: option, index: index };
    });
    // 严格大于才替换，平分自然采用 profiles 的固定顺序。
    var profileIndex = totals.reduce(function (winner, score, index) {
      return score > totals[winner] ? index : winner;
    }, 0);
    var ranked = selected.slice().sort(function (a, b) {
      return b.option.scores[profileIndex] - a.option.scores[profileIndex] || a.index - b.index;
    });
    var first = ranked[0];
    var second = ranked.find(function (entry) {
      return entry.question.chapter !== first.question.chapter;
    }) || ranked[1];
    var evidence = [first, second].map(function (entry) {
      return {
        questionId: entry.question.id,
        questionTitle: entry.question.title,
        optionId: entry.option.id,
        optionText: entry.option.text,
        insight: entry.option.insight
      };
    });
    return { profile: data.profiles[profileIndex], profileIndex: profileIndex, evidence: evidence, totals: totals };
  }

  function createState(version) {
    return {
      version: version,
      unlocked: false,
      consent: false,
      screen: 'gate',
      answers: {},
      cursor: 0,
      completedAt: null
    };
  }

  function isoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
    var milliseconds = Date.parse(value);
    if (!Number.isFinite(milliseconds)) return null;
    var canonical = new Date(milliseconds).toISOString();
    var comparable = value.replace(/(?:\.(\d{1,3}))?Z$/, function (_, fraction) {
      return '.' + (fraction || '').padEnd(3, '0') + 'Z';
    });
    return canonical === comparable ? canonical : null;
  }

  function sanitizeState(input, data) {
    validateData(data);
    var state = createState(data.version);
    if (!record(input) || input.version !== data.version) return state;
    state.unlocked = input.unlocked === true;
    state.consent = input.consent === true;
    data.questions.forEach(function (question) {
      var option = validOption(question, input.answers);
      if (option) state.answers[question.id] = option.id;
    });
    if (Number.isSafeInteger(input.cursor)) state.cursor = Math.min(data.questions.length - 1, Math.max(0, input.cursor));
    state.screen = SCREENS.indexOf(input.screen) !== -1 ? input.screen : (state.unlocked ? 'intro' : 'gate');
    var complete = Object.keys(state.answers).length === data.questions.length;
    state.completedAt = complete ? isoDate(input.completedAt) : null;
    if (!state.unlocked) state.screen = 'gate';
    else if (!state.consent) state.screen = 'intro';
    else if (state.screen === 'gate') state.screen = 'intro';
    else if (state.screen === 'result' && (!complete || !state.completedAt)) state.screen = 'quiz';
    return state;
  }

  return Object.freeze({
    validateData: validateData,
    calculateResult: calculateResult,
    createState: createState,
    sanitizeState: sanitizeState,
    progress: progress
  });
});
