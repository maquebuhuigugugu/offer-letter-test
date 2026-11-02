(function (global) {
  'use strict';

  const WIDTH = 1200;
  const HEIGHT = 1600;
  const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const COLORS = {
    paper: '#FFFBEF',
    background: '#EEE8D8',
    ink: '#282D2B',
    muted: '#77766B',
    red: '#D75B47',
    rule: '#DAD3C1',
    soft: '#F3E7D8',
    navy: '#546C76'
  };
  const CLOSING = /^[，。！？；：、）】》〉」』”’…,.!?;:%％]/u;
  const OPENING = /[（【《〈「『“‘(]$/u;

  function clean(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback || '';
  }

  function font(ctx, size, weight) {
    ctx.font = `${weight || 400} ${size}px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function rule(ctx, x, y, width, color) {
    ctx.strokeStyle = color || COLORS.rule;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }

  function ellipsize(ctx, text, maxWidth) {
    let chars = Array.from(text.replace(/\s+$/u, ''));
    if (ctx.measureText(chars.join('')).width <= maxWidth) return chars.join('');
    while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
    return chars.join('') + '…';
  }

  // All wrapping is measured against the actual Chinese fallback font. Punctuation
  // stays with a neighboring character, rather than starting the following line.
  function wrap(ctx, value, maxWidth, maxLines) {
    const lines = [];
    const paragraphs = String(value || '').replace(/\r\n?/gu, '\n').split('\n');
    for (const paragraph of paragraphs) {
      let line = '';
      for (const char of Array.from(paragraph)) {
        if (!line && /\s/u.test(char)) continue;
        if (!line || ctx.measureText(line + char).width <= maxWidth) {
          line += char;
          continue;
        }
        let carry = '';
        if (CLOSING.test(char) || OPENING.test(line)) {
          const chars = Array.from(line);
          carry = chars.pop() || '';
          line = chars.join('');
        }
        if (line.trim()) lines.push(line.trimEnd());
        line = carry + char;
        while (ctx.measureText(line).width > maxWidth && Array.from(line).length > 1) {
          const chars = Array.from(line);
          const last = chars.pop();
          lines.push(chars.join(''));
          line = last;
        }
      }
      if (line.trim()) lines.push(line.trimEnd());
      else if (!paragraph && lines.length) lines.push('');
    }
    const limit = Math.max(1, maxLines || lines.length || 1);
    if (lines.length > limit) {
      lines.length = limit;
      lines[limit - 1] = ellipsize(ctx, lines[limit - 1] + '…', maxWidth);
    }
    return lines;
  }

  function textBlock(ctx, value, x, y, options) {
    const o = Object.assign({ width: 1008, size: 34, weight: 400, lineHeight: 49, maxLines: 3, color: COLORS.ink }, options);
    font(ctx, o.size, o.weight);
    ctx.fillStyle = o.color;
    const lines = wrap(ctx, value, o.width, o.maxLines);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * o.lineHeight));
    return lines.length * o.lineHeight;
  }

  function fitLine(ctx, value, x, y, options) {
    const o = Object.assign({ width: 1008, size: 96, minSize: 58, weight: 700, color: COLORS.ink }, options);
    let size = o.size;
    font(ctx, size, o.weight);
    while (size > o.minSize && ctx.measureText(value).width > o.width) {
      size -= 1;
      font(ctx, size, o.weight);
    }
    ctx.fillStyle = o.color;
    ctx.fillText(ellipsize(ctx, value, o.width), x, y);
    return size;
  }

  function star(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.18, -size * 0.16, size, 0);
    ctx.quadraticCurveTo(size * 0.18, size * 0.16, 0, size);
    ctx.quadraticCurveTo(-size * 0.18, size * 0.16, -size, 0);
    ctx.quadraticCurveTo(-size * 0.18, -size * 0.16, 0, -size);
    ctx.fill();
    ctx.restore();
  }

  function envelope(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.10);
    ctx.fillStyle = '#F9E7CD';
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    roundedRect(ctx, -48, -30, 96, 67, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-45, -27);
    ctx.lineTo(0, 6);
    ctx.lineTo(45, -27);
    ctx.moveTo(-45, 33);
    ctx.lineTo(-12, 8);
    ctx.moveTo(45, 33);
    ctx.lineTo(12, 8);
    ctx.stroke();
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(1, 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    star(ctx, x + 70, y - 38, 12, COLORS.red);
    star(ctx, x - 62, y + 30, 7, COLORS.navy);
  }

  function postmark(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.11);
    ctx.strokeStyle = COLORS.red;
    ctx.fillStyle = COLORS.red;
    ctx.lineWidth = 2.8;
    for (const radius of [45, 38]) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    font(ctx, 15, 700);
    ctx.textAlign = 'center';
    ctx.fillText('GOOD NEWS', 0, -23);
    font(ctx, 20, 700);
    ctx.fillText('待派送', 0, 0);
    ctx.lineWidth = 2;
    for (let n = 0; n < 3; n += 1) {
      ctx.beginPath();
      ctx.moveTo(50, -14 + n * 14);
      ctx.bezierCurveTo(64, -23 + n * 14, 73, -5 + n * 14, 88, -14 + n * 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  function airmail(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(53, 46, 1094, 15);
    ctx.clip();
    for (let x = 0; x < WIDTH + 80; x += 100) {
      ctx.fillStyle = (Math.floor(x / 100) % 2) ? COLORS.navy : COLORS.red;
      ctx.beginPath();
      ctx.moveTo(x, 46);
      ctx.lineTo(x + 48, 46);
      ctx.lineTo(x + 28, 61);
      ctx.lineTo(x - 20, 61);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function tag(ctx, label, x, y, maxWidth) {
    font(ctx, 27, 500);
    const value = ellipsize(ctx, label, maxWidth - 40);
    const width = Math.min(maxWidth, Math.ceil(ctx.measureText(value).width + 40));
    ctx.fillStyle = '#EFECDC';
    roundedRect(ctx, x, y, width, 52, 26);
    ctx.fill();
    ctx.strokeStyle = '#DBD6C3';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(value, x + 20, y + 11);
    return width;
  }

  function shortInsight(report) {
    const evidence = Array.isArray(report.evidence) ? report.evidence : [];
    const insights = evidence.slice(0, 2).map(item => clean(item && item.insight)).filter(Boolean);
    return insights.length ? insights.join(' ') : '你选过的答案，会留在这封来信里。';
  }

  function blobFromCanvas(canvas) {
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob !== 'function') {
        reject(new Error('此浏览器暂不支持图片导出，请使用系统截图保存。'));
        return;
      }
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('图片生成失败，请重试或使用系统截图保存。'));
      }, 'image/png');
    });
  }

  async function create(report, options) {
    if (!report || !report.profile) throw new TypeError('生成海报需要完整的测试结果。');
    if (!global.document || typeof global.document.createElement !== 'function') throw new Error('海报需要在浏览器中生成。');
    if (global.document.fonts && global.document.fonts.ready) await global.document.fonts.ready;
    const p = report.profile;
    const o = options || {};
    const canvas = global.document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建图片画布，请换一个浏览器重试。');

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.shadowColor = 'rgba(59, 49, 31, 0.10)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = COLORS.paper;
    roundedRect(ctx, 52, 45, 1096, 1503, 6);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#D8D0BB';
    ctx.lineWidth = 1;
    roundedRect(ctx, 52, 45, 1096, 1503, 6);
    ctx.stroke();
    airmail(ctx);

    textBlock(ctx, clean(o.brand, 'OFFER 来信局'), 96, 96, { size: 29, weight: 700, maxLines: 1, width: 600, lineHeight: 35 });
    textBlock(ctx, '一封写给正在赶路的你', 770, 100, { size: 22, maxLines: 1, width: 335, color: COLORS.muted });
    rule(ctx, 96, 151, 1008);

    textBlock(ctx, clean(o.title, '你的 Offer 登场预告'), 96, 189, { size: 27, weight: 500, width: 790, maxLines: 1, color: COLORS.muted });
    postmark(ctx, 1000, 215);
    fitLine(ctx, clean(p.windowLabel, '你的剧情窗口'), 92, 252, { size: 99, minSize: 64, width: 1016, color: COLORS.red, weight: 800 });
    textBlock(ctx, clean(p.windowNote, '这是属于你的剧情时间窗口'), 98, 369, { size: 26, width: 1000, maxLines: 1, color: COLORS.muted, lineHeight: 35 });
    rule(ctx, 96, 424, 1008);

    textBlock(ctx, '本期求职主角', 96, 459, { size: 24, weight: 500, maxLines: 1, color: COLORS.muted });
    fitLine(ctx, clean(p.name, '好消息收件人'), 94, 502, { size: 65, minSize: 45, width: 870, weight: 800 });
    envelope(ctx, 1031, 532);
    textBlock(ctx, '12 次选择，收到一封属于你的来信。', 98, 588, { size: 27, width: 1000, lineHeight: 40, maxLines: 1, color: COLORS.muted });
    const tags = (Array.isArray(p.tags) ? p.tags : ['自己的节奏', '认真赶路', '等待来信']).slice(0, 3);
    let tagX = 96;
    tags.forEach(value => { tagX += tag(ctx, clean(value, '正在赶路'), tagX, 647, 312) + 16; });

    ctx.fillStyle = COLORS.soft;
    roundedRect(ctx, 96, 734, 1008, 219, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(96, 755, 5, 178);
    textBlock(ctx, '你的剧情金句', 126, 760, { size: 23, weight: 500, maxLines: 1, color: COLORS.red, width: 900 });
    let quote = clean(p.quote, '好消息会来，你也正在往前走。').replace(/^[“「"]|[”」"]$/gu, '');
    textBlock(ctx, quote, 126, 807, { size: 40, weight: 600, width: 948, lineHeight: 54, maxLines: 2 });

    textBlock(ctx, '从你的选择里，看见了……', 96, 998, { size: 24, weight: 500, maxLines: 1, color: COLORS.muted });
    textBlock(ctx, shortInsight(report), 96, 1042, { size: 32, width: 1008, lineHeight: 47, maxLines: 3 });

    rule(ctx, 96, 1215, 1008);
    textBlock(ctx, '给你的最后一句', 96, 1250, { size: 24, weight: 500, maxLines: 1, color: COLORS.red });
    textBlock(ctx, clean(p.closing), 96, 1296, { size: 32, width: 1008, lineHeight: 47, maxLines: 2 });

    rule(ctx, 96, 1430, 1008);
    textBlock(ctx, '趣味剧情推演 · 非真实录用预测', 96, 1463, { size: 23, weight: 500, width: 1008, maxLines: 1, color: COLORS.muted });
    star(ctx, 1087, 1482, 12, COLORS.red);

    const blob = await blobFromCanvas(canvas);
    if (!global.URL || typeof global.URL.createObjectURL !== 'function') throw new Error('此浏览器暂不支持保存图片，请使用系统截图。');
    return { blob, url: global.URL.createObjectURL(blob), width: WIDTH, height: HEIGHT };
  }

  global.OfferPoster = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
