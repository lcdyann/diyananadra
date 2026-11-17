/* =====================================================================
   shared.js - used by EVERY page
   1. Light / dark switch
   2. Choice lists (menu, project list): ↑ ↓ keys + hover
   3. Typewriter text in dialogue boxes
   4. Pictures that are not added yet

   Everything waits for "page-ready" (sent by include.js when the top bar
   and switch have been put into the page), so the buttons exist first.
   ===================================================================== */

document.addEventListener('page-ready', function () {


    /* ===================== 1. LIGHT / DARK SWITCH ===================== */
    /*(the first part is the small <script> in each page's <head>: it picks the theme BEFORE the page shows)*/

    var root = document.documentElement; /*the <html> tag*/
    var switches = document.querySelectorAll('.theme-switch');

    /*makes every switch on the page say if dark mode is on (for screen readers)*/
    function updateSwitches() {
        var isDark = root.getAttribute('data-theme') === 'dark';

        switches.forEach(function (sw) {
            sw.setAttribute('aria-checked', isDark ? 'true' : 'false');
        });
    }

    switches.forEach(function (sw) {
        sw.addEventListener('click', function () {
            var isDark = root.getAttribute('data-theme') === 'dark';
            var newTheme = isDark ? 'light' : 'dark';

            root.setAttribute('data-theme', newTheme);
            updateSwitches();

            /*remember the choice for the next visit*/
            try {
                localStorage.setItem('theme', newTheme);
            } catch (e) {
            }
        });
    });

    updateSwitches();


    /* ===================== 2. CHOICE LISTS ===================== */
    /*Any list with class="choice-list" works like a game menu:
      - hover or Tab onto an item  -> it becomes "on" (rises + glows)
      - ↑ ↓ keys                   -> move to the item above / below
                                      (works straight away, no need to click the list first)
      - Enter                      -> opens the chosen item*/

    document.querySelectorAll('.choice-list').forEach(function (list) {
        var items = list.querySelectorAll('.choice');

        /*marks one item as "on" and the others as off*/
        function pick(index) {
            items.forEach(function (item, i) {
                item.classList.toggle('on', i === index);
            });

            /*tells other scripts which item is chosen (projects.js uses this to change the preview)*/
            list.dispatchEvent(new CustomEvent('choose', { detail: index }));
        }

        items.forEach(function (item, i) {
            item.addEventListener('mouseenter', function () { pick(i); });
            item.addEventListener('focus', function () { pick(i); });
        });

        /*keys are listened to on the whole page (document), not only inside the list,
          so ↑ ↓ work as soon as the page opens*/
        document.addEventListener('keydown', function (e) {
            var now = Array.prototype.findIndex.call(items, function (item) {
                return item.classList.contains('on');
            });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[(now + 1) % items.length].focus();
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[(now - 1 + items.length) % items.length].focus();
            }

            /*Enter opens the chosen item (if the focus is not already on a link or button)*/
            if (e.key === 'Enter' && now >= 0 && !e.target.closest('a, button')) {
                e.preventDefault();
                items[now].click();
            }
        });

        /*the first item starts as chosen*/
        if (items.length > 0) {
            pick(0);
        }
    });


    /* ===================== 3. TYPEWRITER ===================== */
    /*Inside a .dialog box:
        <button class="typewriter">
            <span class="tw-full">The whole text</span>
            <span class="tw-shown" aria-hidden="true"></span>
        </button>
      The letters appear one by one in .tw-shown. Click the text to show it all at once.*/

    document.querySelectorAll('.typewriter').forEach(function (box) {
        var full = box.querySelector('.tw-full').textContent.trim();
        var shown = box.querySelector('.tw-shown');
        var dialog = box.closest('.dialog');
        var count = 0;

        var timer = setInterval(function () {
            count = count + 1;
            shown.textContent = full.slice(0, count);

            if (count >= full.length) {
                finish();
            }
        }, 30); /*one letter every 30ms*/

        function finish() {
            clearInterval(timer);
            shown.textContent = full;
            if (dialog) {
                dialog.classList.add('done'); /*shows the ▼*/
            }
        }

        box.addEventListener('click', finish);
    });


    /* ===================== 4. PICTURES NOT ADDED YET ===================== */
    /*A box with data-pic="assets/..." holds a picture. If that file is missing,
      the box gets the class "missing" and CSS shows "Add picture: assets/..." instead.*/

    document.querySelectorAll('[data-pic]').forEach(function (box) {
        var img = box.querySelector('img');

        function markMissing() {
            box.classList.add('missing');
        }

        img.addEventListener('error', markMissing);

        /*it may have failed before this code ran*/
        if (img.complete && img.naturalWidth === 0) {
            markMissing();
        }
    });

}); /*end of page-ready*/
