/* =========================================================
   民宿 もりもり - 共通スクリプト
   サーバーを使わず、ブラウザだけで完結する処理のみ
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 料金の計算ルール ----------
     5名まで一律50,000円、6名目から1名につき5,000円を加算   */
  var BASE_PRICE = 50000;        // 5名までの一律料金
  var BASE_PEOPLE = 5;           // 一律料金に含まれる人数
  var EXTRA_PER_PERSON = 5000;   // 6名目からの1名あたり加算額
  var MAX_PEOPLE = 8;            // 定員（未就学児を除く）

  function pricePerNight(people) {
    var extra = Math.max(0, people - BASE_PEOPLE);
    return BASE_PRICE + extra * EXTRA_PER_PERSON;
  }
  function yen(n) { return n.toLocaleString('ja-JP') + '円'; }

  /* ---------- スマホ用ナビゲーション ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('global-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    // メニュー内のリンクを押したら閉じる
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });

    // 画面幅が戻ったら状態をリセット
    window.addEventListener('resize', function () {
      if (window.innerWidth > 950) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
  }

  /* ---------- スクロールで要素をふわっと表示 ---------- */
  function initReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- よくある質問のアコーディオン ---------- */
  function initFaq() {
    document.querySelectorAll('.faq__q').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        var answer = document.getElementById(btn.getAttribute('aria-controls'));
        btn.setAttribute('aria-expanded', String(!open));
        if (answer) answer.classList.toggle('is-open', !open);
      });
    });
  }

  /* ---------- 写真の拡大表示（ライトボックス） ---------- */
  function initLightbox() {
    var buttons = document.querySelectorAll('.gallery button');
    if (!buttons.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', '拡大表示');
    box.innerHTML =
      '<button type="button" class="lightbox__close" aria-label="閉じる">×</button>' +
      '<div><img alt=""><p class="lightbox__caption"></p></div>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var caption = box.querySelector('.lightbox__caption');
    var closeBtn = box.querySelector('.lightbox__close');
    var lastFocused = null;

    function open(src, alt) {
      lastFocused = document.activeElement;
      img.src = src;
      img.alt = alt;
      caption.textContent = alt;
      box.classList.add('is-open');
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('is-open');
      img.src = '';
      if (lastFocused) lastFocused.focus();
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.querySelector('img');
        if (target) open(target.getAttribute('src'), target.getAttribute('alt') || '');
      });
    });
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }

  /* ---------- 料金計算機（宿のご案内ページ） ---------- */
  function initCalc() {
    var peopleInput = document.getElementById('calc-people');
    var nightsInput = document.getElementById('calc-nights');
    var output = document.getElementById('calc-result');
    if (!peopleInput || !nightsInput || !output) return;

    function update() {
      var people = parseInt(peopleInput.value, 10);
      var nights = parseInt(nightsInput.value, 10);

      if (!people || people < 1 || !nights || nights < 1) {
        output.innerHTML = '<p class="calc__error">人数と泊数を1以上の数字でご入力ください。</p>';
        return;
      }
      if (people > MAX_PEOPLE) {
        output.innerHTML = '<p class="calc__error">定員は' + MAX_PEOPLE + '名です。' +
          '未就学のお子さまは人数に数えません。</p>';
        return;
      }

      var perNight = pricePerNight(people);
      var total = perNight * nights;
      var perPerson = Math.round(perNight / people);   // おひとり1泊あたり

      output.innerHTML =
        '<p class="calc__total">' + yen(total) + '</p>' +
        '<p class="calc__detail">' +
          people + '名 × ' + nights + '泊　（1泊あたり ' + yen(perNight) + '）<br>' +
          'おひとり1泊あたり 約' + yen(perPerson) +
        '</p>';
    }

    peopleInput.addEventListener('input', update);
    nightsInput.addEventListener('input', update);
    update();
  }

  /* ---------- 予約お問い合わせフォーム ----------
     送信サーバーを持たないため、入力内容を検証したうえで
     まとめた文面を表示する。
     メールアドレスが決まったら下の MAIL_TO に設定すると、
     メールソフトで送信するボタンが自動で表示される。        */
  var MAIL_TO = ''; // 例: 'info@example.jp'

  function initForm() {
    var form = document.getElementById('reserve-form');
    if (!form) return;

    var result = document.getElementById('form-result');
    var TEL = '090-3632-5155';

    function fieldOf(input) { return input.closest('.field'); }

    function validate(input) {
      var wrap = fieldOf(input);
      if (!wrap) return true;
      var ok = input.checkValidity();

      // 宿泊日は今日以降のみ受け付ける
      if (ok && input.type === 'date' && input.value) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(input.value) < today) {
          ok = false;
          var err = wrap.querySelector('.field__error');
          if (err) err.textContent = '本日以降の日付をご指定ください。';
        }
      }
      wrap.classList.toggle('has-error', !ok);
      return ok;
    }

    var inputs = form.querySelectorAll('input[required], select[required], textarea[required], input[type="date"], input[type="email"]');
    inputs.forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('has-error')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      inputs.forEach(function (input) {
        if (!validate(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      var data = new FormData(form);
      var labels = {
        name: 'お名前', kana: 'ふりがな', email: 'メールアドレス', tel: '電話番号',
        checkin: 'ご宿泊日', nights: '泊数', people: 'ご宿泊人数', kids: '未就学児',
        bbq: 'BBQのご利用', cars: 'お車の台数', arrival: '到着予定', message: 'ご要望'
      };
      var lines = [];
      Object.keys(labels).forEach(function (key) {
        var value = data.get(key);
        if (!value) return;
        if (key === 'kids' && value === '0') return;   // 0名なら省く
        if (key === 'cars' && value === '0') return;   // 0台なら省く
        if (key === 'people') value += '名';
        if (key === 'kids') value = value + '名（無料）';
        if (key === 'cars') value += '台';
        if (key === 'nights') value = (value === '5' ? '5泊以上' : value + '泊');
        if (key === 'checkin') {
          var d = value.split('-');                                  // 2026-11-03 → 2026年11月3日
          if (d.length === 3) value = d[0] + '年' + Number(d[1]) + '月' + Number(d[2]) + '日';
        }
        lines.push(labels[key] + '：' + value);
      });

      // 概算料金を添える
      var people = parseInt(data.get('people'), 10) || 1;
      var nights = parseInt(data.get('nights'), 10) || 1;
      var estimate = pricePerNight(people) * nights;
      lines.push('料金の目安：' + yen(estimate) + '（' + people + '名 × ' + nights + '泊／未就学児を除く）');

      var body = [
        '民宿もりもり 御中',
        '',
        '下記の内容で空室のご確認をお願いいたします。',
        '',
        lines.join('\n'),
        '',
        '※この文面はウェブサイトの入力フォームで作成されました。'
      ].join('\n');

      var html =
        '<h3>入力内容を確認しました</h3>' +
        '<ul style="margin:0 0 1.2em;padding-left:1.2em">' +
        lines.map(function (line) { return '<li>' + line.replace(/</g, '&lt;') + '</li>'; }).join('') +
        '</ul>';

      if (MAIL_TO) {
        var mailto = 'mailto:' + MAIL_TO +
          '?subject=' + encodeURIComponent('【予約希望】' + (data.get('name') || '') + ' 様') +
          '&body=' + encodeURIComponent(body);
        html =
          '<h3>入力内容を確認しました</h3>' +
          '<p>下のボタンからメールソフトを開いて送信してください。' +
          'お急ぎの場合はお電話（' + TEL + '）でも承ります。</p>' +
          html.replace('<h3>入力内容を確認しました</h3>', '') +
          '<a class="btn btn--kaki" href="' + mailto + '">メールソフトで送信する</a>';
      } else {
        html +=
          '<p>このサイトはまだメールの受け取り先が設定されていません。' +
          '下のボタンで内容をコピーして、お電話やメッセージでお送りください。</p>' +
          '<div class="form-result__actions">' +
            '<button type="button" class="btn btn--kaki" id="copy-summary">内容をコピーする</button>' +
            '<a class="btn btn--ghost" href="tel:09036325155">' + TEL + 'に電話する</a>' +
          '</div>';
      }

      result.innerHTML = html;
      result.classList.add('is-shown');
      result.setAttribute('tabindex', '-1');
      result.focus();
      result.scrollIntoView({ block: 'center', behavior: 'smooth' });

      var copyBtn = document.getElementById('copy-summary');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var done = function () {
            copyBtn.textContent = 'コピーしました';
            setTimeout(function () { copyBtn.textContent = '内容をコピーする'; }, 2400);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(body).then(done, fallbackCopy);
          } else {
            fallbackCopy();
          }
          function fallbackCopy() {
            var ta = document.createElement('textarea');
            ta.value = body;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (err) { /* 何もしない */ }
            document.body.removeChild(ta);
          }
        });
      }
    });
  }

  /* ---------- フッターの年表示 ---------- */
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initFaq();
    initLightbox();
    initCalc();
    initForm();
    initYear();
  });
})();
