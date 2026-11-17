/* =====================================================================
   include.js - puts reusable HTML pieces (top bar, light/dark switch) into the page
   ---------------------------------------------------------------------
   HOW TO USE, in any page:

       <div data-include="modules/shared/topBar.html"
            data-back-link="index.html"
            data-back-text="Menu"
            data-title="ABOUT ME"></div>

   1. It loads the file named in data-include.
   2. Every {{name}} in that file is replaced by the matching data-... value
        {{backLink}} <- data-back-link     {{backText}} <- data-back-text     {{title}} <- data-title
   3. The <div> is swapped for the loaded HTML.
   4. When ALL pieces are in, it sends the event "page-ready".
      shared.js waits for it (the light/dark switch is inside the top bar).

   NOTE: the browser can only load files through a web server
   (Netlify / Vercel / GitHub Pages, or VS Code "Live Server" on your laptop).
   Double-clicking the .html file (file:///...) will not load the top bar.
   ===================================================================== */

function loadOneInclude(box) {
    var file = box.getAttribute('data-include');

    return fetch(file)
        .then(function (response) {
            return response.text();
        })
        .then(function (html) {
            /*replace {{backLink}}, {{title}}... with the data-... values of the box*/
            var filled = html.replace(/\{\{(\w+)\}\}/g, function (whole, name) {
                return box.dataset[name] !== undefined ? box.dataset[name] : '';
            });

            box.outerHTML = filled;
        })
        .catch(function () {
            box.textContent = 'Could not load ' + file;
        });
}

var includeBoxes = document.querySelectorAll('[data-include]');
var allLoading = Array.prototype.map.call(includeBoxes, loadOneInclude);

Promise.all(allLoading).then(function () {
    document.dispatchEvent(new Event('page-ready'));
});
