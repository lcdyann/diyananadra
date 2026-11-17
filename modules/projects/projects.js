/* =====================================================================
   projects.js - builds projects.html and project.html from PROJECTS
   (PROJECTS is the list in projects-data.js)
   1. Helper: copy a <template>
   2. projects.html: the list + the previews
   3. project.html : one project (top bar, screenshots, dots, description, link)
   4. project.html : screenshot carousel (< > buttons, ← → keys, swipe, dots)
   ===================================================================== */


/* ===================== 1. HELPER: COPY A TEMPLATE ===================== */
/*Makes a copy of <template id="..."> and returns a function to find its parts:
      var copy = copyTemplate('preview-template');
      copy.part('name')   -> the element with data-fill="name" inside the copy*/

function copyTemplate(id) {
    var copy = document.getElementById(id).content.cloneNode(true);

    copy.part = function (name) {
        return copy.querySelector('[data-fill="' + name + '"]');
    };

    return copy;
}


/* ===================== 2. PROJECTS.HTML: LIST + PREVIEWS ===================== */

var projectList = document.getElementById('project-list');

if (projectList) {
    var previewsBox = document.getElementById('previews');

    PROJECTS.forEach(function (project, i) {
        var pageLink = 'project.html?p=' + encodeURIComponent(project.id);

        /* ----- one line in the list ----- */
        var item = copyTemplate('list-item-template');
        item.part('link').href = pageLink;
        item.part('thumb').src = project.preview;
        item.part('thumb-box').setAttribute('data-pic', project.preview);
        item.part('name').textContent = project.name;
        item.part('type').textContent = project.type;
        projectList.appendChild(item);

        /* ----- one big preview ----- */
        var preview = copyTemplate('preview-template');
        preview.part('name').textContent = project.name;
        preview.part('picture').src = project.preview;
        preview.part('picture').alt = project.name + ' preview';
        preview.part('picture-box').setAttribute('data-pic', project.preview);
        preview.part('type').textContent = project.type;
        preview.part('link').href = pageLink;

        project.tags.forEach(function (tag) {
            var li = document.createElement('li');
            li.textContent = tag;
            preview.part('tags').appendChild(li);
        });

        if (i === 0) {
            preview.querySelector('.preview').hidden = false; /*the first one shows at the start*/
        }

        previewsBox.appendChild(preview);
    });

    /*shared.js sends "choose" with the number of the chosen line -> show that preview only*/
    projectList.addEventListener('choose', function (e) {
        previewsBox.querySelectorAll('.preview').forEach(function (preview, i) {
            preview.hidden = (i !== e.detail);
        });
    });
}


/* ===================== 3. PROJECT.HTML: ONE PROJECT ===================== */

var shotTrack = document.getElementById('shot-track');

if (shotTrack) {

    /*which project? read ?p=... from the address*/
    var wantedId = new URLSearchParams(window.location.search).get('p');
    var project = PROJECTS.find(function (p) {
        return p.id === wantedId;
    });

    /*unknown or missing ?p= -> go back to the list*/
    if (!project) {
        window.location.replace('projects.html');
    } else {

        /* ----- page title + top bar title ----- */
        document.title = project.name + ' - Diyana Nadra';
        document.getElementById('project-top-bar').setAttribute('data-title', project.name);

        /* ----- description (shared.js types it out) ----- */
        document.getElementById('project-description').textContent = project.description;

        /* ----- website button: only when there is a link ----- */
        var linkBtn = document.getElementById('project-link');
        if (project.link !== '') {
            linkBtn.href = project.link;
            linkBtn.hidden = false;
        }

        /* ----- one screenshot + one dot for each picture ----- */
        var dotsBox = document.getElementById('shot-dots');

        project.screenshots.forEach(function (shot) {
            var slide = copyTemplate('shot-template');
            slide.part('shot').setAttribute('data-name', shot.name);
            slide.part('shot').setAttribute('data-pic', shot.file);
            slide.part('picture').src = shot.file;
            slide.part('picture').alt = shot.name;
            shotTrack.appendChild(slide);

            var dot = copyTemplate('dot-template');
            dot.querySelector('.shot-dot').setAttribute('aria-label', 'Show ' + shot.name);
            dotsBox.appendChild(dot);
        });

        startCarousel();
    }
}


/* ===================== 4. SCREENSHOT CAROUSEL ===================== */

function startCarousel() {
    var shots = document.getElementById('shots');
    var slides = shotTrack.querySelectorAll('.shot');
    var dots = document.querySelectorAll('.shot-dot');
    var nameText = document.getElementById('shot-name');
    var countText = document.getElementById('shot-count');
    var current = 0;

    /*moves to screenshot number "index" (goes round: after the last comes the first)*/
    function showShot(index) {
        current = (index + slides.length) % slides.length;

        /*slide the track: each screenshot is 100% wide*/
        shotTrack.style.transform = 'translateX(-' + (current * 100) + '%)';

        /*plate: name + "2/4"*/
        nameText.textContent = slides[current].getAttribute('data-name');
        countText.textContent = (current + 1) + '/' + slides.length;

        /*fill the dot of the current screenshot*/
        dots.forEach(function (dot, i) {
            dot.classList.toggle('on', i === current);
        });
    }

    /* < > buttons */
    document.getElementById('shot-prev').addEventListener('click', function () { showShot(current - 1); });
    document.getElementById('shot-next').addEventListener('click', function () { showShot(current + 1); });

    /* dots */
    dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { showShot(i); });
    });

    /* ← → keys (anywhere on the page) */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); showShot(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); showShot(current + 1); }
    });

    /* swipe with finger or mouse: more than 50px left = next, right = previous */
    var startX = null;
    var windowBox = document.getElementById('shot-window');

    windowBox.addEventListener('pointerdown', function (e) {
        startX = e.clientX;
    });

    windowBox.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var moved = e.clientX - startX;
        startX = null;

        if (moved < -50) showShot(current + 1);
        if (moved > 50)  showShot(current - 1);
    });

    showShot(0);
}
