(function () {
    // ==========================================
    // HINTS — плавающие подсказки с подсветкой
    // ==========================================
    // Использование:
    //   Hints.show('#authModal .auth-modal-content', 'Введите имя и пароль...');
    //   Hints.show('.heart-btn', 'Лайкните пост, чтобы...', { position: 'top' });
    //   Hints.hide();

    let currentOverlay = null;

    function injectStyles() {
        if (document.getElementById('hints-styles')) return;
        const style = document.createElement('style');
        style.id = 'hints-styles';
        style.textContent = `
            .hint-root {
                position: fixed; inset: 0;
                z-index: 1000000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.25s ease;
            }
            .hint-root.active { opacity: 1; }
            .hint-root.blocking { pointer-events: auto; }

            .hint-svg {
                position: absolute; inset: 0;
                width: 100%; height: 100%;
                display: block;
            }

            .hint-bubble {
                position: fixed;
                max-width: 320px;
                background: #0066ff;
                color: #fff;
                border-radius: 12px;
                padding: 14px 16px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 0.95rem;
                line-height: 1.4;
                font-weight: 500;
                box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
                pointer-events: auto;
                opacity: 0;
                transform: translateY(6px);
                transition: opacity 0.25s ease, transform 0.25s ease;
            }
            .hint-bubble.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .hint-bubble .hint-text { margin-bottom: 10px; }
            .hint-bubble .hint-actions {
                display: flex; justify-content: flex-end; gap: 8px;
            }
            .hint-bubble .hint-btn {
                padding: 6px 12px;
                border-radius: 8px;
                font-family: inherit;
                font-size: 0.85rem;
                font-weight: 700;
                border: none;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
                transition: background 0.15s ease;
            }
            .hint-bubble .hint-btn:hover { background: rgba(255, 255, 255, 0.35); }
            .hint-bubble .hint-btn.primary {
                background: #fff;
                color: #0066ff;
            }
            .hint-bubble .hint-btn.primary:hover { background: #e9efff; }

            .hint-bubble::after {
                content: "";
                position: absolute;
                width: 0; height: 0;
                border: 8px solid transparent;
            }
            .hint-bubble.arrow-bottom::after {
                bottom: -16px; left: 50%;
                transform: translateX(-50%);
                border-top-color: #0066ff;
            }
            .hint-bubble.arrow-top::after {
                top: -16px; left: 50%;
                transform: translateX(-50%);
                border-bottom-color: #0066ff;
            }
            .hint-bubble.arrow-left::after {
                left: -16px; top: 50%;
                transform: translateY(-50%);
                border-right-color: #0066ff;
            }
            .hint-bubble.arrow-right::after {
                right: -16px; top: 50%;
                transform: translateY(-50%);
                border-left-color: #0066ff;
            }
        `;
        document.head.appendChild(style);
    }

    function resolveTarget(target) {
        if (!target) return null;
        if (typeof target === 'string') return document.querySelector(target);
        if (target instanceof Element) return target;
        return null;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function hide() {
        if (!currentOverlay) return;
        const root = currentOverlay;
        root.classList.remove('active');
        setTimeout(() => root.remove(), 250);
        currentOverlay = null;
    }

    function show(target, text, opts) {
        opts = opts || {};
        const el = resolveTarget(target);
        if (!el) {
            console.warn('Hints: target not found', target);
            return;
        }

        injectStyles();

        // Если подсказка уже открыта — закрываем старую
        if (currentOverlay) hide();

        const padding = opts.padding != null ? opts.padding : 6;      // «вырез» вокруг элемента
        const radius  = opts.radius  != null ? opts.radius  : 12;     // скругление выреза
        const blocking = opts.blocking !== false;                     // блокировать клики по фону

        const rect = el.getBoundingClientRect();
        const x = Math.max(0, rect.left - padding);
        const y = Math.max(0, rect.top - padding);
        const w = rect.width + padding * 2;
        const h = rect.height + padding * 2;

        // ====== SVG с маской-вырезом ======
        const root = document.createElement('div');
        root.className = 'hint-root';
        if (blocking) root.classList.add('blocking');

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'hint-svg');
        svg.setAttribute('preserveAspectRatio', 'none');

        // Маска: белый прямоугольник на весь экран, чёрный — вырез
        const defs = document.createElementNS(svgNS, 'defs');
        const mask = document.createElementNS(svgNS, 'mask');
        mask.setAttribute('id', 'hint-mask');

        const maskBg = document.createElementNS(svgNS, 'rect');
        maskBg.setAttribute('x', '0');
        maskBg.setAttribute('y', '0');
        maskBg.setAttribute('width', '100%');
        maskBg.setAttribute('height', '100%');
        maskBg.setAttribute('fill', 'white');
        mask.appendChild(maskBg);

        const maskHole = document.createElementNS(svgNS, 'rect');
        maskHole.setAttribute('x', x);
        maskHole.setAttribute('y', y);
        maskHole.setAttribute('width', w);
        maskHole.setAttribute('height', h);
        maskHole.setAttribute('rx', radius);
        maskHole.setAttribute('fill', 'black');
        mask.appendChild(maskHole);
        defs.appendChild(mask);
        svg.appendChild(defs);

        // Затемнение с «дыркой»
        const dim = document.createElementNS(svgNS, 'rect');
        dim.setAttribute('x', '0');
        dim.setAttribute('y', '0');
        dim.setAttribute('width', '100%');
        dim.setAttribute('height', '100%');
        dim.setAttribute('fill', 'rgba(0, 0, 0, 0.55)');
        dim.setAttribute('mask', 'url(#hint-mask)');
        svg.appendChild(dim);

        root.appendChild(svg);

        // ====== Пузырёк ======
        const bubble = document.createElement('div');
        bubble.className = 'hint-bubble';
        bubble.innerHTML = `
            <div class="hint-text">${escapeHtml(text)}</div>
            <div class="hint-actions">
                ${opts.showSkip ? '<button type="button" class="hint-btn" data-action="skip">Пропустить</button>' : ''}
                <button type="button" class="hint-btn primary" data-action="close">Понятно</button>
            </div>
        `;
        root.appendChild(bubble);

        bubble.querySelector('[data-action="close"]').addEventListener('click', hide);
        const skipBtn = bubble.querySelector('[data-action="skip"]');
        if (skipBtn && opts.onSkip) skipBtn.addEventListener('click', () => { hide(); opts.onSkip(); });

        // Клик по фону — закрыть, если не blocking
        root.addEventListener('click', (e) => {
            if (e.target === root || e.target === svg) {
                if (opts.closeOnBackdrop) hide();
            }
        });

        document.body.appendChild(root);
        currentOverlay = root;

        requestAnimationFrame(() => {
            root.classList.add('active');
            positionBubble(bubble, rect, opts.position || 'auto');
            bubble.classList.add('visible');
        });
    }

    function positionBubble(bubble, targetRect, position) {
        const margin = 14;
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let pos = position;
        if (pos === 'auto') {
            const spaceTop = targetRect.top;
            const spaceBottom = vh - targetRect.bottom;
            pos = spaceTop > bh + margin ? 'top'
                : spaceBottom > bh + margin ? 'bottom'
                : 'top';
        }

        let top, left;
        bubble.classList.remove('arrow-top', 'arrow-bottom', 'arrow-left', 'arrow-right');

        if (pos === 'top') {
            top = targetRect.top - bh - margin;
            left = targetRect.left + targetRect.width / 2 - bw / 2;
            bubble.classList.add('arrow-bottom');
        } else if (pos === 'bottom') {
            top = targetRect.bottom + margin;
            left = targetRect.left + targetRect.width / 2 - bw / 2;
            bubble.classList.add('arrow-top');
        } else if (pos === 'left') {
            top = targetRect.top + targetRect.height / 2 - bh / 2;
            left = targetRect.left - bw - margin;
            bubble.classList.add('arrow-right');
        } else if (pos === 'right') {
            top = targetRect.top + targetRect.height / 2 - bh / 2;
            left = targetRect.right + margin;
            bubble.classList.add('arrow-left');
        }

        // Держим в пределах экрана
        left = Math.max(10, Math.min(left, vw - bw - 10));
        top = Math.max(10, Math.min(top, vh - bh - 10));

        bubble.style.top = top + 'px';
        bubble.style.left = left + 'px';
    }

    window.Hints = { show, hide };
})();